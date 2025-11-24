import Heading from "./heading";

function Link({ href, children }: { href: string, children: any }) {
    return (
        <a target="_blank" rel="noreferrer" href={href} className="w-full h-full rounded-none bg-secondary hover:bg-primary text-primary border-primary border-1 hover:border-secondary hover:text-secondary transition-all flex justify-center text-center items-center p-3 active:border-secondary active:bg-primary active:text-secondary">{children}</a>
    )
}

export default function Links() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center z-10">
            <div className="w-full font-bold h-auto text-5xl sm:text-[200px] flex justify-left absolute text-primary-50">
                <div className="w-auto h-auto font-bold pl-20">

                    <div className='opacity-20 font-bold text-primary'>MPsych Presentation Day:</div>
                    <Heading className='font-semibold text-5xl sm:text-[200px] mix-blend-exclusion'>MarI/O Kart</Heading>
                    <Heading className='font-semibold text-xl sm:text-2xl mix-blend-exclusion'>Featuring Blake Moody</Heading>
                </div>
            </div>

            
        </div>
    )
} 
