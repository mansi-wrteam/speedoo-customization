import React from 'react'
import Image from 'next/image'
import pageNotFound from "@/assets/not_found_images/404.svg"
import { t } from '@/utils/translation'
import { LocalizedLink } from '@/utils/localizedNav'

const Custom404 = () => {
    return (
        <section className="h-screen w-screen flex items-center justify-center">
            <div className='flex flex-col items-center justify-center gap-2 text-center'>
                <Image src={pageNotFound} alt='Page Not found image' height={512} width={512} priority fetchPriority="high" className='h-full w-full' />
                <h2 className='text-2xl font-bold'>{t("page_not_found")}</h2>
                <LocalizedLink href="/" className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]'>
                    {t("home")}
                </LocalizedLink>
            </div>
        </section>
    )
}

export default Custom404
