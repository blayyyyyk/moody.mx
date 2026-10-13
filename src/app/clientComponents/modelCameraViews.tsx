"use client";

import styles from "../../../styles/CameraViews.module.css";
import useGraphicVisibility from "./useGraphicVisibility";

export type CameraModelVariant = "annotated" | "filtered" | "contours" | "detail" | "model";

export default function ModelCameraViews({ variant = "annotated" }: { variant?: CameraModelVariant }) {
    const { ref, near } = useGraphicVisibility();
    const annotated = variant === "annotated";
    return <div ref={ref} className={styles.row} aria-label={annotated ? "Sony α7 III camera views" : "Model-derived camera views"}>
        {["Top", "Side", "Front"].map((view) => {
            const name = view.toLowerCase();
            const source = annotated ? `/camera-illustrations/${name}.svg` : `/prototype-camera-traces/${name}-${variant}.svg`;
            return <figure key={view} className={styles.cell}>
                {variant === "model"
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className={styles.modelRender} loading="lazy" src={`/prototype-camera-traces/${name}-model.png`} alt={`Existing a7.glb camera model, ${name} view`} />
                    : <div className={styles.trace} role="img" aria-label={`Sony α7 III with attached lens, ${name} view`} style={{ maskImage: near ? `url('${source}')` : undefined, backgroundColor: near ? undefined : "transparent" }} />}
                <figcaption className={styles.caption}><span>{annotated ? "α7 III" : "a7.glb"}</span><span>{view}</span></figcaption>
            </figure>;
        })}
    </div>;
}
