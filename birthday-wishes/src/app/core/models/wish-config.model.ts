import { OccasionType } from './occasion.enum';
import { ThemeConfig } from './theme-config.model';

export interface WishConfig {
  /** Unique slug used in the URL  e.g. "satyam-birthday-2026" */
  id: string;
  /** Full name of the person being wished */
  personName: string;
  /** Short name / first name used in greetings */
  shortName: string;
  /** Gender — used to select contextual messaging */
  gender: 'male' | 'female' | 'other';
  /** Type of occasion */
  occasionType: OccasionType;
  /** Display title, e.g. "Happy Birthday!" */
  title: string;
  /** Main subtitle or tagline */
  subtitle: string;
  /** Longer personal message paragraphs */
  messages: string[];
  /** Special highlight phrases shown in big banners */
  highlights: string[];
  /** Theme configuration */
  theme: ThemeConfig;
  /** Optional: extra component to lazy-load for this wish */
  componentKey?: string;
  /** Date/year of the occasion (for display) */
  occasionDate?: Date;
}
