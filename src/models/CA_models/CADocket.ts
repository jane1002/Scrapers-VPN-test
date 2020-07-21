import { Docket } from '../Docket';

export interface CADocket extends Docket{
    filedBy: string,
    industry: string,
    filingDate: string,
    category: string,
    status: string,
    staff: string
}
