"use client"
import styles from '../../../styles/Home.module.css';

export default function Heading(props: {children: string, className?: string, auraText?: string, id?: string}) {
    return (
        <h2 data-ribbon-visual id={props.id ?? props.children.toLowerCase()} className={`${styles.sectionHeading} relative text-primary font-medium text-5xl sm:text-8xl flex items-center justify-start gap-3 ${props.className}`}>
            <span data-ribbon-under className={`${styles.title} z-10 whitespace-nowrap`}>{props.children}</span>
            <span aria-hidden="true" className={`${styles.afterimage1} absolute bottom-0 z-0 whitespace-nowrap`}>{props.children}</span>
            <span aria-hidden="true" className={`${styles.afterimage2} absolute bottom-0 z-0 whitespace-nowrap`}>{props.children}</span>
            <span aria-hidden="true" className={`${styles.afterimage3} absolute bottom-0 z-0 whitespace-nowrap`}>{props.children}</span>
        </h2>
    )
}
