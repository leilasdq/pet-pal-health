import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBreedsByPetType } from "@/lib/petBreeds";

interface BreedComboboxProps {
  petType: 'dog' | 'cat';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function BreedCombobox({ petType, value, onValueChange, placeholder }: BreedComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useLanguage();
  
  const breeds = getBreedsByPetType(petType);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? t(`breed.${value}`) : (placeholder || t('pet.selectBreed'))}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('pet.searchBreed')} />
          <CommandList>
            <CommandEmpty>{t('pet.noBreedFound')}</CommandEmpty>
            <CommandGroup>
              {breeds.map((breed) => (
                <CommandItem
                  key={breed}
                  value={t(`breed.${breed}`)}
                  onSelect={() => {
                    onValueChange(breed);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === breed ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {t(`breed.${breed}`)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
