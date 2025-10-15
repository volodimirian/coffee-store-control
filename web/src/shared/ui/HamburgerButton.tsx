interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function HamburgerButton({ isOpen, onClick }: HamburgerButtonProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      className="flex flex-col justify-center items-center w-8 h-8 space-y-1 group"
      aria-label="Toggle menu"
    >
      <span 
        className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
          isOpen ? 'rotate-45 translate-y-1.5' : ''
        }`} 
      />
      <span 
        className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
          isOpen ? 'opacity-0' : ''
        }`} 
      />
      <span 
        className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
          isOpen ? '-rotate-45 -translate-y-1.5' : ''
        }`} 
      />
    </button>
  );
}
