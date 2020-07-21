export interface Filing {
    docketID: string,
    filingID: string,
    filingDescription: string,
    downloadLinks: Array<string> | undefined
}
