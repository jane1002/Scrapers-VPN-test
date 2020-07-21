import { Filing } from '../Filing';

export interface TXFiling extends Filing {
    fileStamp: string;
    party: string;
}
