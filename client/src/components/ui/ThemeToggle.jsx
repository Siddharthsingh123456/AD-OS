import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../lib/theme";

const META = {
  dark: { Icon: Moon, label: "Dark theme" },
  light: { Icon: Sun, label: "Light theme" },
  system: { Icon: Monitor, label: "Match system theme" },
};

/** One button that cycles dark, light and system. The label always names the current choice. */
export default function ThemeToggle({ className = "btn sm icon-btn" }) {
  const { pref, cycle } = useTheme();
  const { Icon, label } = META[pref];
  return (
    <button type="button" className={className} onClick={cycle} aria-label={`${label}. Click to change.`} title={label}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
