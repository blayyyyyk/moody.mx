import Heading from "./heading";

function Link({ href, children }: { href: string, children: any }) {
    return (
        <a target="_blank" rel="noreferrer" href={href} className="w-full h-full rounded-none bg-secondary hover:bg-primary text-primary border-primary border-1 hover:border-secondary hover:text-secondary transition-all flex justify-center text-center items-center p-3 active:border-secondary active:bg-primary active:text-secondary">{children}</a>
    )
}

export default function Links() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center z-10">
            <div className="w-full font-bold h-auto text-5xl sm:text-[200px] flex justify-center absolute text-primary-50">
                <div className="w-auto h-auto font-bold">

                    <Heading className='font-semibold text-5xl sm:text-[200px] mix-blend-exclusion'>blake</Heading>
                    <div className='opacity-20 font-bold text-primary'>moody.mx</div>
                </div>
            </div>

            <div className="absolute bottom-6 grid grid-cols-2 grid-rows-2 w-[250px] h-auto text-sm gap-3">
                <Link href="https://www.instagram.com/blayyyyyk/">Instagram</Link>
                <Link href="https://github.com/blayyyyyk/" >Github</Link>
                <Link href="https://www.linkedin.com/in/blake-moody-2626ba11b/">LinkedIn</Link>
                <Link href="mailto:blake@mpsych.org">Email</Link>
            </div>
            <div className='absolute top-6 right-6'>
            </div>
        </div>
    )
} 
