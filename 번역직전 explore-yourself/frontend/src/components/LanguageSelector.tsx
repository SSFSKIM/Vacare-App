import { useLanguageStore } from "utils/languageStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();

  const onSelectLanguage = (newLanguage: "en" | "ko") => {
    setLanguage(newLanguage);
  };

  return (
    <Select onValueChange={onSelectLanguage} defaultValue={language}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="ko">Korean</SelectItem>
      </SelectContent>
    </Select>
  );
}
