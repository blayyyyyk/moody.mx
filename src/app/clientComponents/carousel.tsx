import Heading from "./heading";
import {
    Carousel as GenericCarousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"


export default function Carousel({ children, heading, className = "" }: { children: any[], heading?: string, className?: string }) {
    return (
        <div className='max-w-[min(100%,100vw)] p-3 flex flex-col gap-y-3 h-auto'>
            { heading && <Heading className='border-primary border-1 p-3 text-wrap'>{heading}</Heading>}
            <div className='font-inherit w-full px-12 flex flex-col h-auto'>
                <GenericCarousel orientation='horizontal' className="relative flex w-full gap-3 h-full">
                    <CarouselContent className="h-full">
                        {children.map((child: any, index: number) => <CarouselItem key={index} className={`md:basis-1/2 lg:basis-1/3 ${className}`}>{child}</CarouselItem>)}
                    </CarouselContent>
                    <CarouselPrevious className='bg-secondary rounded-none h-full stroke-primary border-primary' />
                    <CarouselNext className='bg-secondary rounded-none h-full stroke-primary border-primary' />
                </GenericCarousel>
            </div>
        </div>
    )
}