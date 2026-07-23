export let getScannedFields = (): HTMLInputElement[] => [];

export function setScannedFields(fields: HTMLInputElement[]) {
  getScannedFields = () => fields;
}
