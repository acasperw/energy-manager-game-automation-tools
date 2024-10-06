import { Page } from "puppeteer";
import { SidebarType, TabName } from "../types/interface";

export async function clickElement(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      (element as HTMLElement).click();
    } else {
      throw new Error(`Element with selector ${sel} not found`);
    }
  }, selector);
}

export async function ifElementExists(page: Page, selector: string) {
  return !!(await page.$eval(selector, () => true).catch(() => false));
}

export function getPaneSelectors(sidebarType: SidebarType) {
  if (sidebarType === SidebarType.Production) {
    return {
      paneId: '#production-pane',
      paneCloseHelperId: '#pane-close-helper',
      paneCloseHelperIconSelector: '#pane-close-helper span',
      tabSelector: (tab: TabName) => `#pane-${tab}`,
    };
  } else if (sidebarType === SidebarType.Vessel) {
    return {
      paneId: '#vessel-pane',
      paneCloseHelperId: '#pane-close-helper-vessel',
      paneCloseHelperIconSelector: '#vessel-pane-close-helper-icon',
      tabSelector: (tab: TabName) => `#vessel-pane-nav #${tab}`,
    };
  }
  throw new Error('Unknown SidebarType');
}
