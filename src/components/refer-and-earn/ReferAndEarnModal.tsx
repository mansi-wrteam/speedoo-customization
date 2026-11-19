import React, { useState } from "react";
import { IoClose, IoCopy, IoPersonAdd } from "react-icons/io5";
import { FaFacebook, FaTwitter, FaWhatsapp } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import ReferAndImage from "@/assets/referandearnimage.svg";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { t } from "@/utils/translation";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";

export interface ReferAndEarnModalProps {
  showReferAndEarn: boolean;
  setShowReferAndEarn: React.Dispatch<React.SetStateAction<boolean>>;
}

type SharePlatform = "facebook" | "twitter" | "whatsapp";

const ReferAndEarnModal = ({ showReferAndEarn, setShowReferAndEarn }: ReferAndEarnModalProps) => {
  const user = useSelector((state: RootState) => state.User.user);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user?.referral_code as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = (process.env.NEXT_PUBLIC_BASE_URL || "").trim();

  const handleShare = (platform: SharePlatform) => {
    const message = (t("refer_share_message") || "")
      .replace(/\{app_name\}/g, process.env.NEXT_PUBLIC_WEB_NAME || "")
      .replace(/\{referal_code\}/g, user?.referral_code || "")
      .replace(/\{webite_link\}/g, shareLink);
    const encodedMessage = encodeURIComponent(message);

    switch (platform) {
      case "facebook":
        // Facebook's sharer takes a URL, not prose — the message was being
        // passed as `u`, which shared a link made out of the whole text.
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareLink
          )}`,
          "_blank"
        );
        break;
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedMessage}`,
          "_blank"
        );
        break;
      case "whatsapp":
        // Emoji are kept out of the share text: WhatsApp renders them as U+FFFD
        // when they arrive through the `text` parameter.
        window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
        break;
    }
  };

  return (
    <Dialog open={showReferAndEarn} onOpenChange={setShowReferAndEarn}>
      <DialogContent className="lg:max-w-2xl md:max-w-xl max-w-sm">
        <DialogHeader className="flex items-end">
          <div className="flex cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
            <RiCloseFill
              size={22}
              onClick={() => setShowReferAndEarn(false)}
              className=""
            />
          </div>
        </DialogHeader>
        <div className="flex item-center flex-col justify-center text-center gap-2 p-4">
          <DialogTitle className="text-2xl font-bold">
            {t("referandearn")}
          </DialogTitle>
          <DialogDescription className="leading-relaxed text-[var(--foreground-secondary)]">
            {t("share_message")}
          </DialogDescription>
        </div>

        <div className="space-y-6">
          {/* Illustration */}
          <div className="flex items-center justify-center">
            <div className="w-[190px] h-[150px] md:w-[390px] md:h-[288px] relative">
              <ImageWithPlaceholder
                src={ReferAndImage}
                alt="Refer & Earn image"
                fill
                sizes="(max-width: 768px) 190px, 390px"
                className="object-cover"
                priority
                fetchPriority="high"
              />
            </div>
          </div>
          {/* Referral Code */}
          <div className="rounded-lg border-2 border-dashed border-[var(--brand-foreground-default)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]">
                  <IoPersonAdd size={20} className="fill-[var(--foreground-inverse)]" />
                </div>
                <span className="font-mono text-lg font-semibold text-[var(--foreground-primary)]">
                  {user?.referral_code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)] flex items-center space-x-2"
              >
                <IoCopy size={16} />
                <span>{copied ? t("copied") : t("copy_code")}</span>
              </button>
            </div>
          </div>

          {/* OR divider */}
          <div className="flex items-center justify-between my-4 gap-2">
            <hr className="flex-grow border-t-2 border-dashed border-[var(--border-default)]" />
            <span className="text-base font-bold text-[var(--foreground-secondary)]">
              {t("or")}
            </span>
            <hr className="flex-grow border-t-2 border-dashed border-[var(--border-default)]" />
          </div>

          {/* Social sharing buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleShare("facebook")}
              className="bg-[var(--status-information-default)] text-[var(--foreground-inverse)] py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-[var(--status-information-foreground)] transition-colors"
            >
              <FaFacebook size={20} />
              <span>{t("facebook")}</span>
            </button>
            <button
              onClick={() => handleShare("twitter")}
              className="bg-[var(--surface-inverse)] text-[var(--foreground-inverse)] py-3 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-[var(--surface-inverse)] transition-colors"
            >
              <FaTwitter size={20} />
              <span>{t("twitter")}</span>
            </button>
            <button
              onClick={() => handleShare("whatsapp")}
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] flex items-center justify-center space-x-2 py-3"
            >
              <FaWhatsapp size={20} />
              <span>{t("whatsapp")}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferAndEarnModal;
