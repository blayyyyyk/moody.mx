import { photoAuthConfigured } from "@/lib/photo-auth";
import PhotoOwnerControls from "./photoOwnerControls";

export default function Footer() {
    return (
        <footer className="w-full h-auto flex flex-wrap items-center justify-between gap-3 p-3 mt-3">
            <div className="text-xs">Made by Blake Moody</div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
                <PhotoOwnerControls configured={photoAuthConfigured()} />
                <span>2026, all rights reserved</span>
            </div>
        </footer>
    )
}
