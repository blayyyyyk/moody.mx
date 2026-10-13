"use client";

import type { ReactNode } from "react";
import { Legend, SonyWordmark } from "./turntable";
import styles from "../../../styles/CameraViews.module.css";

// Geometry references: Sony ILCE-7M3 Help Guide, Names of parts and FE 28–70 OSS.
// https://helpguide.sony.net/ilc/1720/v1/en/contents/TP0001667668.html
// https://helpguide.sony.net/ilc/1720/v1/en/contents/TP0001667670.html
// https://helpguide.sony.net/ilc/1720/v1/en/contents/TP0001630429.html

function Screw({ x, y, r = 3 }: { x: number; y: number; r?: number }) {
    return <g className={styles.fine}><circle cx={x} cy={y} r={r} /><path d={`M${x - r * .6} ${y}h${r * 1.2}M${x} ${y - r * .6}v${r * 1.2}`} /></g>;
}

function RadialTicks({ x, y, radius, count, length = 5 }: { x: number; y: number; radius: number; count: number; length?: number }) {
    return <g className={styles.fine}>{Array.from({ length: count }, (_, index) => <path key={index} d={`M${x} ${y - radius}v${length}`} transform={`rotate(${index * 360 / count} ${x} ${y})`} />)}</g>;
}

function AlphaBadge({ x, y }: { x: number; y: number }) {
    return <g transform={`translate(${x} ${y})`} strokeWidth="1.6">
        <path d="M17 4C12-3 1-1 1 9S11 20 15 12L19 0M5 1C14 0 11 15 21 17M28 0H44L31 18M48 8V18M53 8V18M58 8V18" />
    </g>;
}

function ArcLegend({ children, x, y, radius, start, step = 4.6 }: { children: string; x: number; y: number; radius: number; start: number; step?: number }) {
    return <g>{Array.from(children, (letter, index) => {
        const angle = start + index * step;
        const radians = angle * Math.PI / 180;
        return <g key={index} transform={`translate(${x + Math.cos(radians) * radius} ${y + Math.sin(radians) * radius}) rotate(${angle + 90})`}>
            <Legend x={0} y={0} height={7}>{letter}</Legend>
        </g>;
    })}</g>;
}

function FrontView() {
    return <>
        {/* Strap eyes, shoulders, sculpted grip and the stepped EVF housing. */}
        <path className={styles.surface} strokeWidth="2.4" d="M101 151Q101 139 115 136L211 126 231 121 251 78Q255 67 268 67H372Q383 68 388 80L410 128 529 142Q548 144 548 164L552 388Q552 408 532 411H114Q94 411 94 391V183Z" />
        <path d="M107 389Q107 399 119 399H529Q539 399 539 386V168M109 157 210 139 241 138 262 82H375L399 140 527 153M255 92H384M268 73H370" className={styles.fine} />
        <path className={styles.surface} d="M87 148 69 159 73 181 90 185 103 176 99 152ZM548 151 568 159 565 184 551 184 539 173Z" />
        <path d="m84 156-8 6 3 13 9 3 7-5-3-15Zm465 3 11 5-2 12h-7l-6-7Z" className={styles.fine} />
        <Screw x={96} y={164} /><Screw x={543} y={165} />
        <path d="M115 148Q158 133 185 153L202 193Q188 220 181 258L175 386Q163 401 123 397M120 157Q153 144 177 158L189 190Q174 219 170 258L164 385" />
        <path d="M116 226Q143 215 174 225M117 235Q136 229 168 235M112 270V369M123 280V372M529 194V370M521 202V378" className={styles.fine} />
        <ellipse cx="145" cy="139" rx="27" ry="9" className={styles.surface} />
        <ellipse cx="145" cy="137" rx="21" ry="5" className={styles.fine} />
        <path className={styles.surface} d="M118 171H177V186H118Z" />
        {Array.from({ length: 15 }, (_, i) => <path key={i} className={styles.fine} d={`M${121 + i * 3.7} 174v9`} />)}
        <ellipse cx="168" cy="217" rx="5" ry="9" />
        <circle cx="215" cy="166" r="7" /><circle cx="215" cy="166" r="3.5" className={styles.fine} />
        <SonyWordmark x={276} y={112} width={94} />
        <AlphaBadge x={471} y={160} />
        <path className={styles.surface} d="M282 66V58H357V66M291 61H349" />
        {[239, 411].map((x) => <g key={x} className={styles.fine}>{[0, 5, 10].map((offset) => <path key={offset} d={`M${x + offset} 151v9`} />)}</g>)}
        <circle cx="217" cy="344" r="12" className={styles.surface} /><circle cx="217" cy="344" r="8" className={styles.fine} />
        <Screw x={207} y={393} /><Screw x={520} y={389} />
        {/* E-mount flange, barrel edge and front filter thread. */}
        <circle cx="345" cy="279" r="139" className={styles.surface} strokeWidth="2.4" />
        <circle cx="345" cy="279" r="135" className={styles.fine} />
        <circle cx="345" cy="139" r="3" fill="currentColor" stroke="none" />
        <circle cx="345" cy="279" r="129" className={styles.surface} />
        <RadialTicks x={345} y={279} radius={129} count={96} length={5} />
        {[122, 117, 113, 91, 86, 79, 72].map((r) => <circle key={r} cx="345" cy="279" r={r} className={styles.fine} />)}
        <ArcLegend x={345} y={279} radius={107} start={-144}>FE 3.5-5.6/28-70 OSS</ArcLegend>
        <ArcLegend x={345} y={279} radius={107} start={70} step={5}>SONY</ArcLegend>
        <circle cx="345" cy="279" r="61" />
        {Array.from({ length: 7 }, (_, i) => <path key={i} d="M345 218Q390 219 397 246L367 252Q346 238 324 246" transform={`rotate(${i * 360 / 7} 345 279)`} className={styles.fine} />)}
        <path d="M367 252 381 279 367 306 338 313 315 293 315 265 338 245Z" />
        <path d="M302 192a97 97 0 0 1 86 0M302 367a97 97 0 0 0 86 0" className={styles.fine} />
    </>;
}

function TopView() {
    return <>
        {/* Camera plan: grip/shutter on the right; finder and shoe on the centerline. */}
        <path className={styles.surface} strokeWidth="2.4" d="M106 309Q97 311 96 325L91 405Q91 425 115 426L260 431 275 439H389L402 430 522 425Q548 421 550 398L558 258Q558 236 541 230L489 225Q473 225 466 247L457 282 412 298 258 298 231 308Z" />
        <path d="M105 325 116 318 240 319M105 334 101 401Q102 413 117 414L263 419M400 418 520 413Q534 410 537 395L548 261Q548 247 536 241L492 237Q484 235 479 253L468 291" className={styles.fine} />
        <path className={styles.surface} d="M89 331H76V354H91M549 324H564V348H548" />
        <path d="M80 335H87V350H80ZM554 328H560V343H554Z" className={styles.fine} />
        <circle cx="150" cy="362" r="9" /><path d="M138 362H162" />
        {[0, 5, 10, 15].map((dy) => <path key={dy} className={styles.fine} d={`M169 ${352 + dy}h20`} />)}
        <Screw x={116} y={396} /><Screw x={424} y={416} />
        {/* Parallel lens barrel bands and longitudinal focus/zoom knurling. */}
        <path className={styles.surface} d="M215 41Q216 33 226 33H437Q448 33 449 42L452 221 443 251 430 269V303H234V269L221 250 212 221Z" strokeWidth="2.2" />
        <path d="M218 43H446M217 49H447M215 65H449M214 103H450M214 110H450M214 133H451M214 140H451M214 217H451M216 225H449M225 249H441M236 267H428M236 277H428M236 293H428" className={styles.fine} />
        {Array.from({ length: 41 }, (_, i) => <g key={i} className={styles.fine}><path d={`M${220 + i * 5.5} 67v34M${220 + i * 5.5} 143v72`} /></g>)}
        <Legend x={332} y={116} height={8}>FE 3.5-5.6/28-70 OSS</Legend>
        <Legend x={255} y={233} height={7}>70</Legend><Legend x={295} y={233} height={7}>50</Legend><Legend x={336} y={233} height={7}>35</Legend><Legend x={378} y={233} height={7}>28</Legend>
        <path d="M378 249v8" /><circle cx="378" cy="265" r="2.5" fill="currentColor" stroke="none" />
        <path className={styles.surface} d="M269 331 282 307Q288 298 300 298H363Q376 299 383 312L397 335 387 421H277Z" />
        <path d="M281 335 292 313H365L384 337 376 413H287ZM281 335H384M296 305H364" className={styles.fine} />
        <path className={styles.surface} d="M298 328H369V394H298Z" />
        <path d="M303 335H364V387H303ZM306 333V390M361 333V390M310 335V380H357V335M314 342H353M314 373H353" className={styles.fine} />
        {[0, 6, 12, 18, 24, 30].map((dx) => <path key={dx} className={styles.fine} d={`M${316 + dx} 377v6`} />)}
        <path className={styles.surface} d="M280 422H387V445H280ZM290 427H378V440H290Z" />
        {/* Mode and exposure dials, custom keys, and the shutter/power collar. */}
        <circle cx="445" cy="347" r="36" className={styles.surface} />
        <RadialTicks x={445} y={347} radius={35} count={48} length={4} />
        <circle cx="445" cy="347" r="28" className={styles.fine} />
        {["P", "A", "S", "M", "1", "2", "S&Q"].map((label, i) => {
            const angle = (-100 + i * 44) * Math.PI / 180;
            return <Legend key={label} x={445 + Math.cos(angle) * 21} y={344 + Math.sin(angle) * 21} height={5}>{label}</Legend>;
        })}
        <circle cx="445" cy="347" r="7" className={styles.fine} /><path d="M443 299h4l-2 5Z" fill="currentColor" stroke="none" />
        <circle cx="509" cy="393" r="28" className={styles.surface} />
        <RadialTicks x={509} y={393} radius={27} count={40} length={3.5} />
        <circle cx="509" cy="393" r="21" className={styles.fine} />
        <Legend x={509} y={375} height={5}>0</Legend><Legend x={525} y={389} height={5}>1</Legend><Legend x={509} y={405} height={5}>2</Legend><Legend x={493} y={389} height={5}>-1</Legend>
        <path d="M500 393H518M509 384V402" className={styles.fine} />
        <circle cx="486" cy="303" r="10" className={styles.surface} /><circle cx="515" cy="307" r="10" className={styles.surface} />
        <Legend x={486} y={300} height={5}>C2</Legend><Legend x={515} y={304} height={5}>C1</Legend>
        <path className={styles.surface} d="M482 260A26 26 0 1 1 532 270L540 280 530 290 519 282A26 26 0 0 1 482 260Z" />
        <circle cx="507" cy="262" r="18" /><circle cx="507" cy="262" r="14" className={styles.fine} />
        <path d="m521 282 8 5" /><Legend x={477} y={279} height={6}>OFF</Legend><Legend x={543} y={291} height={6}>ON</Legend>
    </>;
}

function SideView() {
    return <>
        {/* Port-side silhouette, projecting eyecup and the tilting rear monitor. */}
        <path className={styles.surface} strokeWidth="2.4" d="M337 181 352 170 360 129 375 116 391 85 446 69 491 85 511 112 546 115Q561 116 563 135L566 391Q566 413 546 417H367Q343 416 340 397Z" />
        <path d="M350 188 363 176 372 135 385 127 399 96 446 82 482 95 500 124 545 127Q550 129 551 142L555 389Q555 405 542 405H371Q354 405 353 391" className={styles.fine} />
        <path className={styles.surface} d="M544 102H582V150H557M556 107H578V145H561" />
        <path className={styles.surface} d="M559 179H575V384H559ZM562 185H570V378H562Z" />
        <path d="M570 199H579V368H572M566 241H576M566 320H576" className={styles.fine} />
        <path className={styles.surface} d="M449 84V68L466 61 509 83V102M457 80V71L466 68 500 85V96" />
        <path d="m462 73 32 14m-33-8 30 13" className={styles.fine} />
        <path className={styles.surface} d="M513 135 532 132 540 152 530 173 514 168ZM518 142 527 140 533 153 528 165 519 161Z" />
        <Screw x={520} y={154} /><Screw x={545} y={396} /><Screw x={370} y={395} />
        <path d="M413 142V386Q413 392 420 392H505Q513 392 513 384V182M402 144V385" className={styles.fine} />
        {[0, 5, 10, 15].map((dx) => <path key={dx} className={styles.fine} d={`m${405 + dx} 120 15-6`} />)}
        <path className={styles.surface} d="M427 160H496V240H427ZM427 254H498V383H427Z" />
        <path d="M432 166H491V235H432ZM432 260H493V378H432M421 164V185M421 214V236M422 261V286M422 349V378" className={styles.fine} />
        <circle cx="445" cy="184" r="7" /><circle cx="445" cy="184" r="3" className={styles.fine} />
        <circle cx="445" cy="215" r="7" /><circle cx="445" cy="215" r="3" className={styles.fine} />
        <Legend x={470} y={181} height={6}>MIC</Legend>
        <path d="M462 218v-7a7 7 0 0 1 14 0v7m-14-6h3v7h-3Zm11 0h3v7h-3Z" className={styles.fine} />
        <Legend x={464} y={270} height={6}>HDMI</Legend>
        <path d="M445 283H482V291L477 295H450L445 291ZM449 286H478V290H449Z" className={styles.fine} />
        <Legend x={464} y={307} height={6}>USB-C</Legend>
        <rect x="446" y="319" width="36" height="11" rx="5.5" /><path d="M451 324H477" className={styles.fine} />
        <Legend x={464} y={344} height={6}>MULTI</Legend>
        <path d="M446 356H481V365H446ZM451 360H476" className={styles.fine} />
        <circle cx="486" cy="342" r="2" />
        {/* Same 28–70 barrel as the top and front drawings, in side elevation. */}
        <path className={styles.surface} d="M65 161 76 151H242L269 160 289 176H328V184H345V365H328V374H289L267 389 242 400H76L65 390Z" strokeWidth="2.2" />
        <path className={styles.surface} d="M52 168H65V383H52ZM55 173H61V378H55Z" />
        <path d="M73 157V394M82 154V397M99 153V398M132 153V398M140 153V398M159 153V398M169 153V398M236 153V398M244 155V397M269 164V387M284 176V375M303 179V372M321 179V372M333 187V362" className={styles.fine} />
        {Array.from({ length: 35 }, (_, i) => <path key={i} className={styles.fine} d={`M101 ${158 + i * 6.8}h29M172 ${158 + i * 6.8}h61`} />)}
        <g transform="translate(154 278) rotate(-90)"><Legend x={0} y={-3} height={7}>FE 3.5-5.6/28-70 OSS</Legend></g>
        <g transform="translate(260 276) rotate(-90)"><Legend x={0} y={0} height={7}>70 50 35 28</Legend></g>
        <path d="M281 210H287" /><circle cx="301" cy="210" r="2.5" fill="currentColor" stroke="none" />
        <path d="M337 199H345M337 350H345" className={styles.fine} />
    </>;
}

function CameraCell({ view, children }: { view: string; children: ReactNode }) {
    return <figure className={styles.cell}>
        <svg className={styles.drawing} viewBox="0 0 640 480" role="img" aria-label={`Sony α7 III with FE 28–70mm lens, ${view.toLowerCase()} view`}>
            <title>{`Sony α7 III — ${view.toLowerCase()} view`}</title>
            <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</g>
        </svg>
        <figcaption className={styles.caption}><span>α7 III</span><span>{view}</span></figcaption>
    </figure>;
}

export default function CameraViews() {
    return <div className={styles.row} aria-label="Sony α7 III camera views">
        <CameraCell view="Top"><TopView /></CameraCell>
        <CameraCell view="Side"><SideView /></CameraCell>
        <CameraCell view="Front"><FrontView /></CameraCell>
    </div>;
}
