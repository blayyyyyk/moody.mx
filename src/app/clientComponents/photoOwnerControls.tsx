"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { LockKeyhole, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import styles from "../../../styles/PhotoUpload.module.css";

const PhotoUploadDialog = dynamic(() => import("./photoUploadDialog"), { ssr: false });

function Controls({ configured }: { configured: boolean }) {
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const [setup, setSetup] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const owner = session?.photoOwner === true;
    return <div className={styles.ownerControls}>
        {owner ? <>
            <button onClick={() => setOpen(true)}><Upload size={14} aria-hidden="true" />Upload photos</button>
            <button onClick={() => void signOut({ callbackUrl: "/" })}>Sign out</button>
        </> : <button disabled={status === "loading" || signingIn} onClick={() => {
            if (!configured) { setSetup(true); return; }
            setSigningIn(true);
            void signIn("google", { callbackUrl: "/#photos" }).finally(() => setSigningIn(false));
        }}><LockKeyhole size={12} aria-hidden="true" />{signingIn ? "Opening Google…" : "Internal login"}</button>}
        {owner && <PhotoUploadDialog open={open} onClose={() => setOpen(false)} />}
        <Dialog open={setup} onOpenChange={setSetup}>
            <DialogContent className={`${styles.dialog} ${styles.setupDialog}`}>
                <header className={styles.header}><DialogTitle className={styles.title}>Owner sign-in</DialogTitle></header>
                <div className={styles.setupBody}><DialogDescription>Google owner sign-in has not been configured yet. Add the Google OAuth credentials and authorized owner email to the server environment, then restart the site. Setup details are in AGENTS.md.</DialogDescription></div>
            </DialogContent>
        </Dialog>
    </div>;
}

export default function PhotoOwnerControls({ configured }: { configured: boolean }) {
    return <SessionProvider refetchOnWindowFocus={false}><Controls configured={configured} /></SessionProvider>;
}
