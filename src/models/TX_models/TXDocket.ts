import { Docket } from '../Docket';

export interface TXDocket extends Docket{
    numberOfFilings: number,
    utility: string,
}
