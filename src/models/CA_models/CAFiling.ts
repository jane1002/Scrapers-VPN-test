import { Filing } from '../Filing';

export interface CAFiling extends Filing{
    documentType: string,
    filedBy: string,
    filingDate: string
}
