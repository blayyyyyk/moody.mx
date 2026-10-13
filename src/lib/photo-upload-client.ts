import { PHOTO_CHUNK_BYTES, type DrivePhotoResult, type UploadProgress, type UploadRole } from "./photo-upload-policy";

export type PhotoUploadJob = { file: File; role: UploadRole; uploadId: string; ticket?: string; offset: number; result?: DrivePhotoResult };

class UploadRequestError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

async function request<T>(url: string, init: RequestInit, signal: AbortSignal): Promise<T> {
    const response = await fetch(url, { ...init, signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new UploadRequestError(response.status, data.error || "The upload request failed. Please retry.");
    return data;
}

export async function uploadPhotoJob(job: PhotoUploadJob, description: string, signal: AbortSignal, onProgress: (bytes: number) => void): Promise<DrivePhotoResult> {
    if (job.result) { onProgress(job.file.size); return job.result; }
    const apply = (progress: UploadProgress) => {
        if (!Number.isSafeInteger(progress.offset) || progress.offset < 0 || progress.offset > job.file.size || (progress.complete && !progress.file)) throw new UploadRequestError(502, "Invalid upload confirmation.");
        job.offset = progress.offset;
        if (progress.complete) job.result = progress.file;
        onProgress(job.offset);
    };
    const status = () => request<UploadProgress>("/api/admin/photos/upload/chunk", { headers: { "x-photo-upload": job.ticket! } }, signal);
    if (job.ticket) {
        try { apply(await status()); }
        catch (error) { if (error instanceof UploadRequestError && error.status === 410) { job.ticket = undefined; job.offset = 0; } else throw error; }
    }
    if (!job.ticket && !job.result) {
        const started = await request<UploadProgress & { ticket?: string }>("/api/admin/photos/upload/start", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: job.file.name, size: job.file.size, role: job.role, uploadId: job.uploadId, description }),
        }, signal);
        apply(started);
        job.ticket = started.ticket;
        if (!job.result && !job.ticket) throw new UploadRequestError(502, "No upload session was returned.");
    }
    let retries = 0;
    while (!job.result) {
        const offset = job.offset;
        try {
            const update = await request<UploadProgress>("/api/admin/photos/upload/chunk", {
                method: "PUT", headers: { "Content-Type": "application/octet-stream", "x-photo-upload": job.ticket!, "x-photo-offset": String(offset) },
                body: job.file.slice(offset, Math.min(offset + PHOTO_CHUNK_BYTES, job.file.size)),
            }, signal);
            apply(update);
            if (!update.complete && update.offset <= offset) throw new UploadRequestError(502, "The upload did not advance. Please retry.");
            retries = 0;
        } catch (error) {
            if (signal.aborted || retries++ >= 2 || (error instanceof UploadRequestError && error.status < 500)) throw error;
            // The bytes may have reached Drive even if the response was lost.
            apply(await status());
        }
    }
    return job.result;
}
