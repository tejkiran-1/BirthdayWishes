export interface ThemeConfig {
  /** CSS class applied to the body / wish wrapper */
  themeClass: string;
  /** Primary background color */
  bgColor: string;
  /** Accent / highlight color */
  accentColor: string;
  /** Secondary accent */
  secondaryColor: string;
  /** Text color */
  textColor: string;
  /** Emojis / symbols used as floating particles */
  particles: string[];
  /** Small label describing the vibe (e.g. "Martial Arts") */
  vibeLabel: string;
}
