import { type Locator } from '@playwright/test';

export class Modal {
  readonly root: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(root: Locator, saveTestId: string) {
    this.root = root;
    this.saveButton = root.getByTestId(saveTestId);
    this.cancelButton = root.getByTestId('modal-cancel');
  }

  async isOpen(): Promise<boolean> {
    return this.root.isVisible();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
