"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaCopy,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaTelegram,
} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import toast from "react-hot-toast";

const ShareModal = ({
  isOpen,
  onClose,
  shareUrl,
  imageId,
  pannellumInstanceRef,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentShareUrl, setCurrentShareUrl] = useState(shareUrl);

  // Update share URL dynamically when modal is open
  useEffect(() => {
    if (isOpen && pannellumInstanceRef?.current && imageId) {
      const updateShareUrl = () => {
        try {
          const viewState = {
            yaw: pannellumInstanceRef.current.getYaw(),
            pitch: pannellumInstanceRef.current.getPitch(),
            hfov: pannellumInstanceRef.current.getHfov(),
          };

          const baseUrl = window.location.origin;
          const params = new URLSearchParams({
            id: imageId,
            yaw: viewState.yaw.toFixed(2),
            pitch: viewState.pitch.toFixed(2),
            hfov: viewState.hfov.toFixed(2),
          });

          setCurrentShareUrl(`${baseUrl}?${params.toString()}`);
        } catch (error) {
          console.error("Error updating share URL:", error);
          setCurrentShareUrl(shareUrl);
        }
      };

      // Update immediately
      updateShareUrl();

      // Update on an interval while modal is open
      const interval = setInterval(updateShareUrl, 500);

      return () => clearInterval(interval);
    } else {
      setCurrentShareUrl(shareUrl);
    }
  }, [isOpen, pannellumInstanceRef, imageId, shareUrl]);

  // Reset copied state when modal closes or URL changes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setCopied(false);
  }, [currentShareUrl]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const shareText = `Check out this 360° street view - Image ${imageId}`;
  const encodedUrl = encodeURIComponent(currentShareUrl);
  const encodedText = encodeURIComponent(shareText);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!", {
        duration: 2000,
        icon: "📋",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const socialPlatforms = [
    {
      name: "WhatsApp",
      icon: FaWhatsapp,
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      name: "Facebook",
      icon: FaFacebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Twitter",
      icon: FaTwitter,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "bg-sky-500 hover:bg-sky-600",
    },
    {
      name: "Telegram",
      icon: FaTelegram,
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      name: "Email",
      icon: MdEmail,
      url: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
      color: "bg-gray-600 hover:bg-gray-700",
    },
  ];

  const handleSocialShare = (url) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-4 transform transition-all duration-300 scale-in'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10'
          aria-label='Close'
        >
          <FaTimes className='text-xl' />
        </button>

        {/* Header */}
        <div className='text-center mb-6'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-8 w-8 text-white'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'
              />
            </svg>
          </div>
          <h2 className='text-2xl font-bold text-white mb-2'>
            Share This View
          </h2>
          <p className='text-gray-400 text-sm'>
            Share this 360° panorama with others
          </p>
        </div>

        {/* Copy Link Section */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-300 mb-2'>
            Link
          </label>
          <div className='flex items-center gap-2'>
            <div className='flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 text-sm truncate'>
              {currentShareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <FaCopy className='text-lg' />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className='relative mb-6'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-700'></div>
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='px-4 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-400'>
              Or share via
            </span>
          </div>
        </div>

        {/* Social Platforms */}
        <div className='grid grid-cols-3 gap-3'>
          {socialPlatforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handleSocialShare(platform.url)}
              className={`${platform.color} text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
              aria-label={`Share on ${platform.name}`}
            >
              <platform.icon className='text-2xl' />
              <span className='text-xs font-medium'>{platform.name}</span>
            </button>
          ))}
        </div>

        {/* Footer Note */}
        <div className='mt-6 text-center'>
          <p className='text-xs text-gray-500'>
            Anyone with the link can view this panorama at the exact same angle
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
