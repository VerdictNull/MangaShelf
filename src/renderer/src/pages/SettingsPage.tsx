import { useSettingsStore } from '@renderer/store/settingsStore'
import { Monitor, Moon, Sun, BookOpen, Download, Eye, Keyboard } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import type { AppSettings, Theme, ReaderMode, ReadingDirection, FontSize, ImageQuality } from '@shared/types'

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Icon size={16} className="text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
        value ? 'bg-primary' : 'bg-muted'
      )}
    >
      <div className={cn(
        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function SegmentedControl<T extends string>({
  options, value, onChange
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="flex bg-secondary rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 py-1 text-xs rounded transition-colors',
            value === o.value
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const KEYBOARD_SHORTCUTS = [
  ['Arrow Right / D', 'Next page'],
  ['Arrow Left / A', 'Previous page'],
  ['[ / ]', 'Previous / Next chapter'],
  ['Page Up / Down', '±5 pages'],
  ['Home / End', 'First / Last page'],
  ['M', 'Cycle reader mode'],
  ['Z', 'Cycle zoom mode'],
  ['F', 'Toggle fullscreen'],
  ['H', 'Toggle controls overlay'],
  ['T', 'Toggle thumbnail strip'],
  ['Escape', 'Exit reader'],
  ['Ctrl+K', 'Command palette']
]

export function SettingsPage(): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const updateSetting = useSettingsStore((s) => s.update)

  if (!settings) return <div className="p-6"><p className="text-muted-foreground text-sm">Loading settings...</p></div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold">Settings</h1>

      {/* Appearance */}
      <Section title="Appearance" icon={Monitor}>
        <SettingRow label="Theme">
          <SegmentedControl<Theme>
            options={[
              { value: 'light', label: '☀' },
              { value: 'dark', label: '🌙' },
              { value: 'system', label: 'Auto' }
            ]}
            value={settings.theme}
            onChange={(v) => updateSetting('theme', v)}
          />
        </SettingRow>

        <SettingRow label="Font Size" description="Affects UI text size throughout the app">
          <SegmentedControl<FontSize>
            options={[
              { value: 'small', label: 'S' },
              { value: 'medium', label: 'M' },
              { value: 'large', label: 'L' },
              { value: 'xl', label: 'XL' }
            ]}
            value={settings.fontSize}
            onChange={(v) => updateSetting('fontSize', v)}
          />
        </SettingRow>

        <SettingRow label="Animations" description="Enable smooth transitions and animations">
          <Toggle
            value={settings.animationsEnabled}
            onChange={(v) => updateSetting('animationsEnabled', v)}
          />
        </SettingRow>

        <SettingRow label="High Contrast" description="Increase contrast for accessibility">
          <Toggle
            value={settings.highContrast}
            onChange={(v) => updateSetting('highContrast', v)}
          />
        </SettingRow>

        <SettingRow label="Reduce Motion" description="Honor system reduce motion preference">
          <Toggle
            value={settings.reduceMotion}
            onChange={(v) => updateSetting('reduceMotion', v)}
          />
        </SettingRow>
      </Section>

      {/* Reader */}
      <Section title="Reader" icon={BookOpen}>
        <SettingRow label="Default Mode">
          <SegmentedControl<ReaderMode>
            options={[
              { value: 'single', label: 'Single' },
              { value: 'double', label: 'Double' },
              { value: 'webtoon', label: 'Webtoon' }
            ]}
            value={settings.readerMode}
            onChange={(v) => updateSetting('readerMode', v)}
          />
        </SettingRow>

        <SettingRow label="Reading Direction">
          <SegmentedControl<ReadingDirection>
            options={[
              { value: 'ltr', label: 'L→R' },
              { value: 'rtl', label: 'R→L' }
            ]}
            value={settings.readingDirection}
            onChange={(v) => updateSetting('readingDirection', v)}
          />
        </SettingRow>

        <SettingRow label="Background" description="Color behind manga pages in reader">
          <SegmentedControl<AppSettings['backgroundStyle']>
            options={[
              { value: 'black', label: 'Black' },
              { value: 'gray', label: 'Gray' },
              { value: 'white', label: 'White' }
            ]}
            value={settings.backgroundStyle}
            onChange={(v) => updateSetting('backgroundStyle', v)}
          />
        </SettingRow>

        <SettingRow label="Show Page Numbers">
          <Toggle
            value={settings.showPageNumbers}
            onChange={(v) => updateSetting('showPageNumbers', v)}
          />
        </SettingRow>

        <SettingRow label="Prefetch Pages" description="Pages to load ahead for smoother reading">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={settings.prefetchPages}
              onChange={(e) => updateSetting('prefetchPages', Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-sm w-4 text-center">{settings.prefetchPages}</span>
          </div>
        </SettingRow>
      </Section>

      {/* Downloads */}
      <Section title="Downloads" icon={Download}>
        <SettingRow label="Image Quality">
          <SegmentedControl<ImageQuality>
            options={[
              { value: 'data-saver', label: 'Data Saver' },
              { value: 'data', label: 'Original' }
            ]}
            value={settings.imageQuality}
            onChange={(v) => updateSetting('imageQuality', v)}
          />
        </SettingRow>

        <SettingRow label="Concurrent Downloads" description="How many chapters download at once">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={5}
              value={settings.downloadConcurrency}
              onChange={(e) => updateSetting('downloadConcurrency', Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-sm w-4 text-center">{settings.downloadConcurrency}</span>
          </div>
        </SettingRow>

        <SettingRow label="Auto-Download New Chapters" description="When new chapters are found for Reading manga">
          <Toggle
            value={settings.autoDownloadNewChapters}
            onChange={(v) => updateSetting('autoDownloadNewChapters', v)}
          />
        </SettingRow>
      </Section>

      {/* Language */}
      <Section title="Content" icon={Eye}>
        <SettingRow label="Preferred Language">
          <select
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value)}
            className="px-2.5 py-1.5 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
            <option value="ko">Korean</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="pt-br">Portuguese (BR)</option>
          </select>
        </SettingRow>
      </Section>

      {/* Keyboard shortcuts */}
      <Section title="Keyboard Shortcuts" icon={Keyboard}>
        <div className="grid grid-cols-1 gap-0.5">
          {KEYBOARD_SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
              <span className="text-sm text-muted-foreground">{label}</span>
              <kbd className="px-2 py-0.5 text-xs bg-secondary rounded border border-border font-mono">{key}</kbd>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
