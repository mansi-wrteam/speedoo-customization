import ImageWithPlaceholder from '../image-with-placeholder/ImageWithPlaceholder'
import type { Country as CountryModel } from "@/types/models/catalog";

export interface CountryProps {
    country: CountryModel;
    bgColor?: string | null;
}

const Country = ({ country, bgColor }: CountryProps) => {
    return (
        <div className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl">
            <div
                className={`flex aspect-square w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl p-3 md:aspect-auto md:h-32 ${bgColor ? "" : "bg-[var(--surface-subtle)]"}`}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
            >
                <ImageWithPlaceholder
                    src={`${process.env.NEXT_PUBLIC_API_URL}/storage/${country.logo}`}
                    alt={country?.translations?.name ?? country?.name}
                    width={200}
                    height={200}
                    sizes="200px"
                    className="h-full w-full rounded-xl object-contain md:h-24"
                />
            </div>
            <div className="line-clamp-2 self-stretch text-center text-base font-normal leading-6 text-[var(--foreground-primary)] transition-colors group-hover:text-[var(--brand-foreground-default)]">
                {country?.translations?.name ?? country?.name}
            </div>
        </div>
    )
}

export default Country
