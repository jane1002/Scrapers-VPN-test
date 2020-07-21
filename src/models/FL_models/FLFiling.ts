import { Filing } from '../Filing';

export interface FLFiling extends Filing {
    order: string | undefined,
    dateFiled: string
}
