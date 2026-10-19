"use client";

import { useId, useState } from "react";
import type { MusicTrack } from "@/lib/spotify-types";
import styles from "../../../styles/Turntable.module.css";

// The control legends are paths, not font-dependent SVG text.
const lettering: Record<string, string> = {
    A: "M0 7 2.5 0 5 7M1 4.5H4",
    B: "M0 7V0H2.7Q5 0 5 1.75T2.7 3.5H0M2.7 3.5Q5 3.5 5 5.25T2.7 7Z",
    C: "M5 1Q4 0 2.5 0Q0 0 0 3.5T2.5 7Q4 7 5 6",
    D: "M0 7V0H2Q5 0 5 3.5T2 7Z",
    E: "M5 0H0V7H5M0 3.5H4",
    F: "M0 7V0H5M0 3.5H4",
    G: "M5 1Q4 0 2.5 0Q0 0 0 3.5T2.5 7Q4 7 5 6V3.5H2.8",
    H: "M0 0V7M5 0V7M0 3.5H5",
    I: "M1 0H4M2.5 0V7M1 7H4",
    L: "M0 0V7H5",
    M: "M0 7V0L2.5 4 5 0V7",
    N: "M0 7V0L5 7V0",
    O: "M2.5 0Q0 0 0 3.5T2.5 7T5 3.5T2.5 0Z",
    P: "M0 7V0H2.5Q5 0 5 2T2.5 4H0",
    Q: "M2.5 0Q0 0 0 3.5T2.5 7T5 3.5T2.5 0ZM3 5 5.5 7.5",
    R: "M0 7V0H2.5Q5 0 5 2T2.5 4H0M2.5 4 5 7",
    S: "M5 1Q4 0 2.5 0Q0 0 0 1.75T2.5 3.5T5 5.25T2.5 7Q1 7 0 6",
    T: "M0 0H5M2.5 0V7",
    U: "M0 0V4.5Q0 7 2.5 7T5 4.5V0",
    V: "M0 0 2.5 7 5 0",
    W: "M0 0 1 7 2.5 3 4 7 5 0",
    Y: "M0 0 2.5 3.5 5 0M2.5 3.5V7",
    Z: "M0 0H5L0 7H5",
    "0": "M2.5 0Q0 0 0 3.5T2.5 7T5 3.5T2.5 0ZM.8 5.8 4.2 1.2",
    "1": "M1 1.5 2.5 0V7M0.5 7H4.5",
    "2": "M0 1.5Q0 0 2.5 0T5 1.75Q5 3 2.5 4.5L0 7H5",
    "3": "M0 0H5L2.5 3Q5 3 5 5T2.5 7Q0 7 0 5.5",
    "4": "M4 7V0L0 5H5",
    "5": "M5 0H0V3H2.5Q5 3 5 5T2.5 7Q0 7 0 5.5",
    "6": "M4.5.5Q0-1 0 4.5Q0 7 2.5 7T5 5T2.5 3Q1 3 0 4",
    "7": "M0 0H5L1.5 7",
    "8": "M2.5 3.5Q0 3.5 0 1.75T2.5 0T5 1.75T2.5 3.5Q0 3.5 0 5.25T2.5 7T5 5.25T2.5 3.5Z",
    "9": "M.5 6.5Q5 8 5 2.5Q5 0 2.5 0T0 2T2.5 4Q4 4 5 3",
    "/": "M0 7 5 0",
    "-": "M0 3.5H5",
    "+": "M0 3.5H5M2.5 1V6",
    ".": "M2.5 6.5V7",
    "&": "M5 7 1 2.5Q-1-1 2 0T2 3Q-1 5 0 6.5T3.5 6L5 3.5",
};

export function Legend({ children, x, y, height = 10, centered = true }: {
    children: string; x: number; y: number; height?: number; centered?: boolean;
}) {
    const scale = height / 7;
    const width = (children.length * 7 - 2) * scale;
    return <g transform={`translate(${x - (centered ? width / 2 : 0)} ${y}) scale(${scale})`} strokeWidth="0.75" strokeLinecap="square" strokeLinejoin="miter" fill="none">
        {Array.from(children, (character, index) => lettering[character]
            ? <path key={index} d={lettering[character]} transform={`translate(${index * 7} 0)`} /> : null)}
    </g>;
}

// Sony wordmark outline: https://commons.wikimedia.org/wiki/File:Sony_logo.svg
const sonyWordmark = "m456.0129 225.27997c-46.41279 0-89.42079-13.82399-118.09279-39.60319a96.895989 96.895989 0 0 1-32.12799-73.19039 98.329588 98.329588 0 0 1 32.12799-72.934395C364.54411 15.359998 411.64811 0 456.0129 0c49.07519 0 88.37119 12.364799 118.39999 39.603195a97.407989 97.407989 0 0 1 31.69279 72.883195 101.52959 101.52959 0 0 1-31.69279 73.19039c-27.9808 25.9328-71.9104 39.60319-118.39999 39.60319v-29.64479c24.6016 0 47.43679-8.4992 63.38559-24.3712 15.9488-15.872 23.1936-35.1232 23.1936-58.87999 0-22.681601-7.9616-43.878398-23.1936-58.879996-15.744-15.487998-39.11679-24.217597-63.38559-24.217597-24.2688 0-47.74399 8.652799-63.48799 24.217597-15.1808 15.027198-23.04 36.300795-23.04 58.879996a82.35519 82.35519 0 0 0 23.04 58.87999c15.744 15.6928 39.06559 24.3712 63.48799 24.3712ZM117.12014 0C92.313748 0 64.128151 4.6591995 40.320154 15.359998 18.099355 25.292797.0001575 41.241595.0001575 67.686392A54.220794 54.220794 0 0 0 14.720156 104.95999c6.425599 5.9392 16.793599 16.0256 43.878396 21.9648 12.108798 2.55999 37.990395 6.68159 63.769588 9.39519 25.7792 2.7136 50.7648 5.12 61.0048 7.8592 8.1408 2.0736 21.83679 4.8896 21.83679 20.2496 0 15.36-14.41279 19.968-16.92159 20.9664-2.5088.9984-19.8144 8.9344-50.8928 8.9344a216.42237 216.42237 0 0 1-60.59519-10.4192c-11.596799-4.1472-23.756797-9.6-35.097596-23.4496a40.268795 40.268795 0 0 1-7.295999-22.2208H6.2465567v78.84799H37.529754v-10.67519a4.4543995 4.4543995 0 0 1 6.7584-3.84 246.42557 246.42557 0 0 0 45.772794 14.79679c16.435202 3.4304 27.059192 5.9136 47.487992 5.9136a202.62398 202.62398 0 0 0 63.6416-8.9856 111.07839 111.07839 0 0 0 37.81119-18.66239 51.814394 51.814394 0 0 0 20.24959-41.4976 58.060793 58.060793 0 0 0-16.35839-40.80639 72.012792 72.012792 0 0 0-20.1728-13.798402 148.60798 148.60798 0 0 0-24.88319-8.678399c-16.2304-3.967999-52.6848-8.934399-70.1184-10.675198-18.27839-1.8944-49.99679-4.5312-62.668789-8.447999-3.839999-1.2032-11.673599-4.9152-11.673599-14.003199 0-6.476799 3.584-11.955198 10.649599-16.383998C75.26415 34.303996 97.945747 29.926396 121.60014 29.926396a166.98878 166.98878 0 0 1 66.7136 13.030399 72.857591 72.857591 0 0 1 15.87199 9.471999 47.718394 47.718394 0 0 1 15.6416 26.163197h25.2672V9.9583988h-28.16v7.9615992c0 2.56-2.56 5.939199-7.68 3.1488C196.55694 14.463998 160.87054.17919998 117.12014 0Zm618.21433 12.595199 137.62558 124.185581-1.408-83.609586c-.1536-10.982399-2.1504-15.564798-14.0288-15.564798H831.66726V12.595199h117.75998v25.011197h-25.26719c-12.0832 0-12.8 3.891199-13.0048 15.564798l2.1248 159.769586h-40.32L714.41927 71.475192V171.85278c.128 10.9312.64 16.0768 11.8784 16.0768h28.16v25.0112H639.02728v-25.0112h27.0336c10.08639 0 9.67679-9.6256 9.67679-16.64V54.118394c0-7.679999-1.0752-16.486398-16.89599-16.486398h-21.9136V12.595199ZM1083.776 187.87838a55.859193 55.859193 0 0 0 6.9632-.4352 8.627199 8.627199 0 0 0 5.4272-4.8128 28.006397 28.006397 0 0 0 .5376-5.4016v-39.552c0-1.3312 0-1.3568-1.6896-3.456-1.6896-2.0992-72.0896-81.919986-75.2896-85.503986-3.9936-4.351999-11.008-11.084798-21.68316-11.084798h-24.448V12.595199h137.98396v24.985597h-16.64c-3.84 0-6.4 3.660799-3.1232 7.679999 0 0 46.4384 55.551995 46.8736 56.140795.4352.5888.8192.7168 1.408.1792.5888-.5376 47.5904-55.807995 47.9488-56.319995a4.7871994 4.7871994 0 0 0-4.096-7.679999h-17.0752V12.595199H1280v25.036797h-25.2672c-9.1648 0-12.8 1.689599-19.7888 9.471998l-76.16 86.886386a5.3759994 5.3759994 0 0 0-.9216 3.6864v39.5264a28.159997 28.159997 0 0 0 .5632 5.4016 8.524799 8.524799 0 0 0 5.4016 4.8128 50.611194 50.611194 0 0 0 6.912 .4352h25.8304v25.0368h-137.2672v-25.0368Z";

export function SonyWordmark({ x, y, width }: { x: number; y: number; width: number }) {
    return <path d={sonyWordmark} transform={`translate(${x} ${y}) scale(${width / 1280})`} fill="currentColor" stroke="none" />;
}

function Hinge({ x }: { x: number }) {
    return <g transform={`translate(${x} 9)`}>
        <path className={styles.surface} d="M0 48V8L7 0H62V49H49V17H16V49Z" />
        <path d="M0 8H55L62 0M55 8V39H49M7 0V8M16 17H49M19 21H46M8 12V38H16M3 48H20M45 49H64" />
        <path className={styles.surface} d="M9 39H23V49H9ZM42 39H56V49H42Z" />
        <path d="M13 42V47M19 42V47M46 42V47M52 42V47" strokeWidth="1.3" />
    </g>;
}

function Control({ x, y, label, playing = false }: { x: number; y: number; label: string; playing?: boolean }) {
    return <g>
        <circle cx={x} cy={y} r="23" className={styles.surface} />
        <circle cx={x} cy={y} r="20" strokeWidth="1" />
        {playing && <circle cx={x} cy={y} r="3" fill="currentColor" stroke="none" />}
        <Legend x={x} y={y + 35}>{label}</Legend>
    </g>;
}

function Tonearm({ playing }: { playing: boolean }) {
    return <g transform="translate(1034 286)">
        <g className={styles.tonearm} data-position={playing ? "playing" : "resting"}>
            <g transform="translate(-1034 -286)">
                <path className={styles.surface} d="M1022 153Q1034 149 1046 153V649C1046 684 1037 711 1022 741L974 849 952 840 1000 728C1014 700 1022 678 1022 649Z" strokeWidth="3" />
                <path d="M1027 166V649C1027 680 1018 706 1005 733L959 839M1040 166V649C1040 682 1031 708 1017 738L971 842M1023 162H1045M1023 637H1045" strokeWidth="1.2" />
                <path className={styles.surface} d="M1019 266H1051V309H1019Z" />
                <path d="M1024 271V304M1046 271V304" strokeWidth="1.3" />
                <path className={styles.surface} d="m1020 754 68 29-5 11-69-29Z" />
                <path d="m1020 758 63 27m-3-5-4 10" strokeWidth="1" />
                <path className={styles.surface} d="m966 811 17 8-15 37-18-8Z" />
                <path d="m969 818 8 4-11 27-9-4Zm-12 29-3 9 8 3 3-9" strokeWidth="1.4" />
                <path d="m978 804 6-12m-23 18-6 12" strokeWidth="2" />
            </g>
        </g>
    </g>;
}

export default function Turntable({ track }: { track: MusicTrack | null }) {
    const id = useId().replaceAll(":", "");
    const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
    const playing = track !== null;
    const image = track?.image && track.image !== failedArtwork ? track.image : null;

    return <svg data-ribbon-visual className={styles.turntable} viewBox="0 0 1200 1040" role="img" aria-labelledby={`${id}-title ${id}-description`} data-playing={playing}>
        <title id={`${id}-title`}>Sony PS-LX310BT record player</title>
        <desc id={`${id}-description`}>{playing ? `Playing ${track.name} by ${track.artist}. The vinyl and circular album-art label spin clockwise beneath the tonearm.` : "Playback is stopped. The platter is empty and the tonearm is parked in its rest."}</desc>
        <defs>
            <clipPath id={`${id}-label`}><circle r="136" /></clipPath>
        </defs>
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="miter" aria-hidden="true">
            {/* Dust-cover hinges and the rear chassis hardware, as seen from above. */}
            <Hinge x={176} /><Hinge x={954} />
            <path className={styles.surface} d="M298 58V50H307V41H326V49H337V58M362 58V49H374V58M560 58V41H572V58M744 58V42H758V58" />
            <path d="M310 45H324M303 53H332M564 44V55M748 46V55" strokeWidth="1.2" />

            {/* Square plinth, with separate top bevel and front fascia edges. */}
            <path data-part="plinth" className={styles.surface} d="M1 58H1199V1035H1Z" strokeWidth="3" />
            <path d="M5 62H1195V1030H5ZM1 58 5 62M1199 58 1195 62M5 1030 1 1035M1195 1030 1199 1035" strokeWidth="1" />
            <SonyWordmark x={42} y={100} width={93.44} />

            {/* Circular arm well sits behind the platter's lip. */}
            <circle cx="968" cy="286" r="122" className={styles.surface} strokeWidth="2" />
            <path d="M863 348A121 121 0 0 0 1065 360M874 354A110 110 0 0 0 1055 353" strokeWidth="1.4" />
            <path className={styles.surface} d="M953 387V378A13 13 0 0 1 979 378V387ZM958 386V378A8 8 0 0 1 974 378V386" />

            {/* Empty platter stays on the player when the removable vinyl is absent. */}
            <g data-part="platter">
                <circle cx="530" cy="547" r="421" className={styles.surface} strokeWidth="3" />
                <circle cx="530" cy="547" r="416" strokeWidth="1.5" />
                <circle cx="530" cy="547" r="411" strokeWidth="1.2" />
                <circle cx="530" cy="547" r="401" strokeWidth="0.9" />
                <circle cx="530" cy="547" r="23" strokeWidth="1.4" />
                <circle cx="530" cy="547" r="17" strokeWidth="1" />
            </g>

            {playing && <g transform="translate(530 547)">
                <g className={styles.vinyl} data-part="vinyl">
                    <circle r="408" className={styles.surface} strokeWidth="2.5" />
                    <circle r="402" strokeWidth="1.2" />
                    {Array.from({ length: 45 }, (_, index) => <circle key={index} r={393 - index * 5.4} strokeWidth={index % 9 === 0 ? 1.8 : 0.8} />)}
                    <circle r="147" strokeWidth="1" />
                    <path d="M147 0C147 81 80 146 0 146S-145 80-145 0-80-144 0-144 143-80 143 0" strokeWidth="0.8" />
                    <circle r="139" className={styles.surface} strokeWidth="1.5" />
                    {image ? <image key={image} data-part="record-label" href={image} x="-136" y="-136" width="272" height="272" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-label)`} onError={() => setFailedArtwork(image)} /> : <g data-part="record-label-fallback">
                        <circle r="136" className={styles.surface} />
                        <circle r="112" strokeWidth="1" />
                        <path d="M-44-16V16M-22-34V34M0-48V48M22-28V28M44-12V12" strokeWidth="3" />
                    </g>}
                    <circle r="136" strokeWidth="1.5" />
                    <circle r="10" className={styles.surface} strokeWidth="1.5" />
                </g>
            </g>}
            <circle cx="530" cy="547" r="6" className={styles.surface} strokeWidth="1.8" />
            <path d="M527 544 531 542 535 546M529 548 532 549" strokeWidth="1" />

            {/* Arm bearing, horizontal pivot barrel, lift/rest bracket. */}
            <path className={styles.surface} d="M1006 264H1056Q1063 266 1063 274V301Q1063 310 1056 312H1006Z" />
            <path d="M1056 269V307M1010 268H1052M1010 308H1052" strokeWidth="1.2" />
            <circle cx="968" cy="286" r="60" className={styles.surface} strokeWidth="3" />
            <circle cx="968" cy="286" r="54" strokeWidth="1.3" />
            <path className={styles.surface} d="M1039 535H1055V540H1064V554H1055V559H1039Z" />
            <path d="M1046 537V557M1056 544H1073V551H1064" strokeWidth="1.4" />

            <g data-part="size-selector">
                <circle cx="1121" cy="463" r="23" className={styles.surface} />
                <circle cx="1121" cy="463" r="20" strokeWidth="1" />
                <path d="M1124 463H1140M1149 463H1155M1141 438 1146 433" strokeWidth="1.8" />
                <Legend x={1166} y={458} height={8}>12</Legend>
                <Legend x={1151} y={426} height={8}>7</Legend>
                <Legend x={1121} y={499}>SIZE</Legend>
            </g>
            <g data-part="speed-selector">
                <circle cx="1121" cy="632" r="23" className={styles.surface} />
                <circle cx="1121" cy="632" r="20" strokeWidth="1" />
                <path d="M1124 632H1140M1149 632H1155M1146 647 1152 650" strokeWidth="1.8" />
                <Legend x={1167} y={627} height={8}>33</Legend>
                <Legend x={1165} y={647} height={8}>45</Legend>
                <Legend x={1121} y={667}>SPEED</Legend>
            </g>

            <circle cx="91" cy="951" r="23" className={styles.surface} />
            <circle cx="91" cy="951" r="20" strokeWidth="1" />
            <circle cx="59" cy="984" r="2" fill="currentColor" stroke="none" />
            <Legend x={96} y={980} height={8}>BLUETOOTH</Legend>
            <path d="M74 995H77" strokeWidth="1.2" />
            <Legend x={104} y={992} height={6}>PAIRING</Legend>
            <Control x={914} y={951} label="START" playing={playing} />
            <Control x={1006} y={951} label="STOP" />
            <Control x={1098} y={951} label="UP/DOWN" />

            {/* Last in paint order so the stylus always sits above the spinning record. */}
            <Tonearm playing={playing} />
        </g>
    </svg>;
}
