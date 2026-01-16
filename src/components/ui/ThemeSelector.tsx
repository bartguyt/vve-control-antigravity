import { Select, SelectItem } from "@tremor/react";
import { useTheme } from "../providers/ThemeProvider";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    return (
        <Select value={theme} onValueChange={(val: any) => setTheme(val)} enableClear={false}>
            <SelectItem value="light" icon={SunIcon}>
                Licht
            </SelectItem>
            <SelectItem value="dark" icon={MoonIcon}>
                Donker
            </SelectItem>
            <SelectItem value="system" icon={ComputerDesktopIcon}>
                System
            </SelectItem>
        </Select>
    );
}
