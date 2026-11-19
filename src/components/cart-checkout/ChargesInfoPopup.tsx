import React, { useEffect, useRef } from 'react';

export interface ChargesInfoPopupProps {
    /** Plain text, or a small breakdown element (delivery charge per seller). */
    message: React.ReactNode;
    onClose: () => void;
}

const ChargesInfoPopup = ({ message, onClose }: ChargesInfoPopupProps) => {
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click was outside the popup
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Delay attaching to avoid immediate closing on the click that opens it
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={popupRef}
            className="absolute left-0 top-6 z-50 min-w-[220px] rounded-lg bg-[var(--surface-default)] p-3 text-xs font-normal text-[var(--foreground-secondary)] shadow-xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
        >
            {message}
        </div>
    );
};

export default ChargesInfoPopup;