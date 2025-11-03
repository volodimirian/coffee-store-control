import { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
  id: string | number;
  name: string;
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
  truncateOptions?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  noResultsText,
  disabled = false,
  className = "",
  truncateOptions = false
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.name
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        );

  return (
    <div className={className}>
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
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
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-[100] mt-1 max-h-60 w-auto min-w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                      `relative cursor-default select-none py-2 pl-10 pr-4 whitespace-nowrap ${
                        active ? 'bg-blue-600 text-white' : 'text-gray-900'
                      }`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block ${truncateOptions ? 'truncate' : ''} ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                          title={truncateOptions ? option.name : undefined}
                        >
                          {option.name}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
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
        </div>
      </Combobox>
    </div>
  );
}
