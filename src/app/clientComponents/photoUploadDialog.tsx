"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EXIF_FIELDS, editedExifTags, type ExifForm, type InspectedPhoto, type MetadataRequest, type PreparedPhoto } from "@/lib/photo-metadata";
import { MAX_PHOTO_BYTES, PHOTO_ACCEPT, photoFormat } from "@/lib/photo-upload-policy";
import { uploadPhotoJob, type PhotoUploadJob } from "@/lib/photo-upload-client";
import styles from "../../../styles/PhotoUpload.module.css";

const megabytes = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`;

export default function PhotoUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [inspection, setInspection] = useState<InspectedPhoto | null>(null);
    const [form, setForm] = useState<ExifForm>({});
    const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [complete, setComplete] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadStarted, setUploadStarted] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const worker = useRef<Worker | null>(null);
    const pending = useRef<{ resolve: (value: InspectedPhoto | PreparedPhoto) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
    const sequence = useRef(0);
    const generation = useRef(0);
    const jobs = useRef<PhotoUploadJob[]>([]);
    const abort = useRef<AbortController | null>(null);
    const invokingControl = useRef<HTMLElement | null>(null);

    useEffect(() => () => {
        generation.current++;
        abort.current?.abort();
        worker.current?.terminate();
        if (pending.current) { clearTimeout(pending.current.timer); pending.current.reject(new Error("Processing cancelled.")); pending.current = null; }
    }, []);

    const preview = prepared?.preview ?? inspection?.preview;
    useEffect(() => {
        if (!preview) { setPreviewUrl(null); return; }
        const url = URL.createObjectURL(preview);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [preview]);

    function stopWork() {
        generation.current++;
        abort.current?.abort();
        worker.current?.terminate(); worker.current = null;
        if (pending.current) { clearTimeout(pending.current.timer); pending.current.reject(new Error("Processing cancelled.")); pending.current = null; }
        setBusy("");
        if (uploadStarted && !complete) setError((previous) => previous || "Upload paused. Resume to continue.");
    }

    function resetImage() {
        stopWork();
        setFile(null); setInspection(null); setPrepared(null); setForm({}); setComplete(false);
        setUploadStarted(false); setProgress(0); setError(""); jobs.current = [];
    }

    function close() {
        if (uploadStarted && !complete) stopWork();
        else resetImage();
        onClose();
    }

    function processMetadata(message: Omit<Extract<MetadataRequest, { action: "inspect" }>, "id">): Promise<InspectedPhoto>;
    function processMetadata(message: Omit<Extract<MetadataRequest, { action: "prepare" }>, "id">): Promise<PreparedPhoto>;
    function processMetadata(message: Omit<MetadataRequest, "id">): Promise<InspectedPhoto | PreparedPhoto> {
        if (!worker.current) {
            // This is a prebuilt, self-hosted worker, not a bundler worker entry.
            worker.current = new window.Worker("/photo-tools/metadata-worker.js", { type: "module" });
            worker.current.onmessage = ({ data }) => {
                if (data.id !== sequence.current || !pending.current) return;
                const request = pending.current; pending.current = null; clearTimeout(request.timer);
                if (data.error) request.reject(new Error(data.error)); else request.resolve(data.result);
            };
            worker.current.onerror = () => {
                if (pending.current) { clearTimeout(pending.current.timer); pending.current.reject(new Error("The local metadata editor could not start. Refresh and try again.")); pending.current = null; }
                worker.current?.terminate(); worker.current = null;
            };
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { worker.current?.terminate(); worker.current = null; pending.current = null; reject(new Error("Local image processing timed out. Please try a smaller file.")); }, 180000);
            pending.current = { resolve, reject, timer };
            worker.current!.postMessage({ ...message, id: ++sequence.current });
        });
    }

    async function selectFile(selected: File | undefined) {
        if (!selected || busy) return;
        setError("");
        if (!photoFormat(selected.name) || selected.size > MAX_PHOTO_BYTES) { setError("Choose a JPEG, PNG, or supported RAW file under 128 MB."); return; }
        const version = ++generation.current;
        setFile(selected); setInspection(null); setPrepared(null); setComplete(false); setUploadStarted(false); setProgress(0); jobs.current = [];
        setBusy("Reading metadata locally…");
        try {
            const result = await processMetadata({ action: "inspect", file: selected });
            if (generation.current !== version) return;
            setInspection(result); setForm(result.form);
        } catch (error) { if (generation.current === version) setError(error instanceof Error ? error.message : "The image could not be read."); }
        finally { if (generation.current === version) setBusy(""); }
    }

    async function prepare() {
        if (!file || !inspection || busy) return;
        const version = generation.current;
        setError("");
        try {
            editedExifTags(form, inspection.form);
            setBusy("Writing and verifying EXIF locally…");
            const result = await processMetadata({ action: "prepare", file, form, original: inspection.form });
            if (generation.current !== version) return;
            setPrepared(result);
            jobs.current = result.files.map(({ file, role }) => ({ file, role, uploadId: crypto.randomUUID(), offset: 0 }));
        } catch (error) { if (generation.current === version) setError(error instanceof Error ? error.message : "The image could not be prepared."); }
        finally { if (generation.current === version) setBusy(""); }
    }

    async function upload() {
        if (!prepared || busy) return;
        const version = generation.current;
        const controller = new AbortController();
        abort.current = controller;
        setError(""); setUploadStarted(true);
        const total = jobs.current.reduce((sum, job) => sum + job.file.size, 0);
        let finished = 0;
        try {
            for (const job of jobs.current) {
                if (generation.current !== version || controller.signal.aborted) return;
                setBusy(`Uploading ${job.role === "raw-original" ? "RAW original" : job.role === "raw-preview" ? "gallery JPEG" : "image"}…`);
                await uploadPhotoJob(job, form.description ?? "", controller.signal, (bytes) => {
                    if (generation.current === version) setProgress(Math.round((finished + bytes) / total * 100));
                });
                finished += job.file.size;
            }
            if (generation.current !== version) return;
            setComplete(true); setProgress(100); router.refresh();
        } catch (error) { if (generation.current === version) setError(error instanceof Error ? error.message : "Upload interrupted. Resume to continue."); }
        finally { if (generation.current === version) setBusy(""); }
    }

    const sections = [...new Set(EXIF_FIELDS.map((field) => field.section))];
    return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
        <DialogContent className={styles.dialog} onOpenAutoFocus={() => {
            invokingControl.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }} onCloseAutoFocus={(event) => {
            if (invokingControl.current?.isConnected) { event.preventDefault(); invokingControl.current.focus({ preventScroll: true }); }
        }}>
            <header className={styles.header}>
                <DialogTitle className={styles.title}>Upload photos</DialogTitle>
                <DialogDescription className={styles.description}>Choose an image, review its EXIF, then send it to the gallery’s Google Drive folder.</DialogDescription>
            </header>
            <div className={styles.body}>
                <div className={styles.previewColumn}>
                    <label className={styles.picker} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!uploadStarted) void selectFile(event.dataTransfer.files[0]); }}>
                        <ImagePlus size={24} aria-hidden="true" />
                        <span>{file ? "Choose another image" : "Choose an image"}</span>
                        <span className={styles.small}>JPEG / PNG / RAW · up to 128 MB</span>
                        <input className="sr-only" type="file" accept={PHOTO_ACCEPT} aria-label="Choose image file" disabled={Boolean(busy) || uploadStarted} onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} />
                    </label>
                    {file && <p className={styles.fileInfo}>{file.name}<br />{megabytes(file.size)}</p>}
                    {previewUrl && <div className={styles.preview}>
                        {/* Blob preview: pixels are inspected locally, never sent to an image proxy. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Selected photograph preview" />
                    </div>}
                    {inspection && <p className={styles.note}>{prepared?.previewNote ?? inspection.previewNote}</p>}
                    {inspection?.raw && <p className={styles.note}>Two files will be saved in Drive: the RAW original and a JPEG for the website.</p>}
                    {prepared && <div className={styles.prepared}>
                        <strong><Check size={14} aria-hidden="true" /> EXIF verified</strong>
                        <span>{prepared.changed} field{prepared.changed === 1 ? "" : "s"} changed.</span>
                        {prepared.files.map(({ file, role }) => <span key={role}>{file.name} · {megabytes(file.size)}</span>)}
                    </div>}
                    {jobs.current.filter((job) => job.result).map((job) => <a key={job.uploadId} className={styles.savedLink} href={job.result!.url} target="_blank" rel="noopener noreferrer">Saved: {job.result!.name} ↗</a>)}
                </div>
                <div className={styles.editor}>
                    {inspection ? <>
                        {sections.map((section) => <fieldset className={styles.group} key={section} disabled={Boolean(busy) || uploadStarted}>
                            <legend>{section}</legend>
                            <div className={styles.fields}>{EXIF_FIELDS.filter((field) => field.section === section).map((field) => <label key={field.key} className={field.key === "description" ? styles.wideField : undefined}>
                                <span>{field.label}</span>
                                {field.kind === "select" ? <select value={form[field.key] ?? ""} onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setPrepared(null); }}>
                                    <option value="">Not recorded</option>
                                    {form[field.key] && !field.choices?.some(([key]) => key === form[field.key]) && <option value={form[field.key]}>Recorded value: {form[field.key]}</option>}
                                    {field.choices?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select> : field.key === "description" ? <textarea rows={2} maxLength={2000} value={form[field.key] ?? ""} onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setPrepared(null); }} />
                                    : <input type={field.kind === "date" ? "datetime-local" : "text"} step={field.kind === "date" ? "1" : undefined} inputMode={field.kind === "number" ? "decimal" : undefined} maxLength={240} placeholder={field.placeholder ?? "Not recorded"} value={form[field.key] ?? ""} onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setPrepared(null); }} />}
                            </label>)}</div>
                        </fieldset>)}
                        <p className={styles.note}>Clear a recorded field to remove that EXIF tag. Other embedded metadata is preserved in the original file. Preparing does not upload anything.</p>
                        <details className={styles.allTags}><summary>All detected metadata</summary><pre>{JSON.stringify(prepared?.metadata ?? inspection.metadata, null, 2)}</pre></details>
                    </> : <p className={styles.empty}>Your image stays on this device while you inspect and edit its metadata.</p>}
                </div>
            </div>
            <footer className={styles.footer}>
                <div className={styles.status} role="status" aria-live="polite">
                    {busy && <span className={styles.busy}><Loader2 size={16} className={styles.spinner} aria-hidden="true" />{busy}{uploadStarted ? ` ${progress}%` : ""}</span>}
                    {uploadStarted && <progress max={100} value={progress} aria-label="Upload progress" />}
                    {error && <p role="alert" className={styles.error}>{error}{jobs.current.some((job) => job.result) ? " Files already saved are linked above; resume to finish the rest." : ""}</p>}
                    {complete && <p>Saved to Google Drive. The gallery has been refreshed.</p>}
                </div>
                <div className={styles.actions}>
                    <button type="button" onClick={busy && uploadStarted ? stopWork : close}>{complete ? "Done" : busy && uploadStarted ? "Pause upload" : busy ? "Cancel" : "Close"}</button>
                    {uploadStarted && !busy && !complete && <button type="button" onClick={resetImage}>New image</button>}
                    {!complete && <button type="button" className={styles.primary} disabled={!inspection || Boolean(busy)} onClick={() => void (prepared ? upload() : prepare())}>
                        <Upload size={16} aria-hidden="true" />{prepared ? uploadStarted ? "Resume upload" : "Upload to Drive" : "Prepare image"}
                    </button>}
                </div>
            </footer>
        </DialogContent>
    </Dialog>;
}
