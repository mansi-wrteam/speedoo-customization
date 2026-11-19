import React from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { RiCloseFill } from "react-icons/ri";
import { t } from '@/utils/translation';
import ProfileSidebar from './ProfileSidebar';
import { useSelector } from 'react-redux';
import type { RootState } from '@/types/state';

export interface ProfileDrawerProps {
    showProfile: boolean;
    setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
    /** Passed through to ProfileSidebar. */
    selectedTab: string;
    setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
}

const ProfileDrawer = ({ showProfile, setShowProfile, selectedTab, setSelectedTab }: ProfileDrawerProps) => {

    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    return (
        <Sheet open={showProfile} >
            <SheetContent className="p-0 w-full sm:w-[900px] " side={language?.type == "RTL" ? "left" : "right"}>
                <SheetHeader className="px-0 py-3 border-[1px] flex justify-between text-left">
                    <SheetTitle className="text-2xl font-bold flex flex-row items-center p-2 justify-between">
                        <p className='text-2xl font-bold'>{t("profile")}</p>
                        <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                            <RiCloseFill size={22} onClick={() => setShowProfile(false)} />
                        </div>
                    </SheetTitle>
                </SheetHeader>
                <div className='overflow-y-scroll h-[calc(100dvh-74px)]'>
                    <ProfileSidebar setSelectedTab={setSelectedTab} selectedTab={selectedTab} />
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default ProfileDrawer