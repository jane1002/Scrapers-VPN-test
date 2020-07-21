import { Docket } from '../Docket';

export interface FLDocket extends Docket{
    dateDocketed: string,
    CASRApproved: string,
    status?: string
}
