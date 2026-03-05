import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Unit } from '~/shared/api/types';

interface UnitSelectorProps {
  categoryId: number;
  defaultUnitId: number;  // Actually the selected unit ID from parent state
  availableUnits: Unit[];
  onUnitChange: (unitId: number) => void;
}

export default function UnitSelector({
  categoryId,
  defaultUnitId,
  availableUnits,
  onUnitChange
}: UnitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use defaultUnitId from parent (which already loads from localStorage)
  const selectedUnitId = defaultUnitId;

  // Update dropdown position when it opens
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap below button
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Listen for scroll events to update position
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('scroll', updatePosition, true);
      return () => window.removeEventListener('scroll', updatePosition, true);
    }
  }, [isOpen]);

  const handleSelectUnit = (unitId: number) => {
    localStorage.setItem(`inventoryTracking_unit_${categoryId}`, unitId.toString());
    onUnitChange(unitId);
    setIsOpen(false);
  };

  const selectedUnit = availableUnits.find((u) => u.id === selectedUnitId);

  // If only one unit available, don't show selector
  if (availableUnits.length <= 1) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded border border-gray-300 transition-colors"
        title="Select display unit"
      >
        <span>{selectedUnit?.symbol || 'Unit'}</span>
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[100] bg-white border border-gray-300 rounded shadow-lg overflow-auto max-h-60"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${Math.max(dropdownPosition.width, 120)}px`,
            maxWidth: '200px'
          }}
        >
          {availableUnits.map((unit) => (
            <button
              key={unit.id}
              type="button"
              onClick={() => handleSelectUnit(unit.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                unit.id === selectedUnitId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              {unit.symbol} - {unit.name}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
