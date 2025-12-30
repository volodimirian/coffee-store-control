import { useState, Fragment, useRef, useEffect } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
  id: string | number;
  name: string;
  subtitle?: string;
  [key: string]: unknown; // Allow additional properties
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: SelectOption | null;
  onChange: (value: SelectOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noResultsText,
  disabled = false,
  className = ""
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, []);

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) => {
          const searchText = query.toLowerCase().replace(/\s+/g, '');
          const nameMatch = option.name.toLowerCase().replace(/\s+/g, '').includes(searchText);
          const subtitleMatch = option.subtitle 
            ? option.subtitle.toLowerCase().replace(/\s+/g, '').includes(searchText)
            : false;
          return nameMatch || subtitleMatch;
        });

  return (
    <div className={className}>
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        {({ open }) => {
          if (open) {
            updatePosition();
          }
          return (
            <>
              <div ref={buttonRef} className="relative">
                <div className="relative w-full cursor-default rounded-lg bg-white text-left border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                  <Combobox.Input
                    className={`w-full border-none rounded-lg py-2 px-3 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none pr-10 ${
                      disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                    }`}
                    displayValue={(option: SelectOption | null) => option?.name || ''}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={value ? undefined : placeholder}
                    disabled={disabled}
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronUpDownIcon
                      className={`h-5 w-5 ${disabled ? 'text-gray-400' : 'text-gray-400'}`}
                      aria-hidden="true"
                    />
                  </Combobox.Button>
                </div>
              </div>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => setQuery('')}
              >
                <Combobox.Options 
                  className="fixed z-[100] mt-1 max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                  style={{
                    top: `${dropdownPosition.top + 4}px`,
                    left: `${dropdownPosition.left}px`,
                    minWidth: `${dropdownPosition.width}px`,
                    maxWidth: '400px',
                    width: 'auto'
                  }}
                >
                  {query.length > 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                      {searchPlaceholder}
                    </div>
                  )}
                  {filteredOptions.length === 0 && query !== '' ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      {noResultsText}
                    </div>
                  ) : (
                    filteredOptions.map((option) => (
                      <Combobox.Option
                        key={option.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-8 pr-4 ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`
                        }
                        value={option}
                      >
                        {({ selected, active }) => (
                          <>
                            <div className="flex flex-col">
                              <span
                                className={`block truncate ${
                                  selected ? 'font-medium' : 'font-normal'
                                }`}
                                title={option.name}
                              >
                                {option.name}
                              </span>
                              {option.subtitle && (
                                <span
                                  className={`text-xs truncate ${
                                    active ? 'text-blue-100' : 'text-gray-500'
                                  }`}
                                  title={option.subtitle}
                                >
                                  {option.subtitle}
                                </span>
                              )}
                            </div>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-2 ${
                                  active ? 'text-white' : 'text-blue-600'
                                }`}
                              >
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </Transition>
            </>
          );
        }}
      </Combobox>
    </div>
  );
}
