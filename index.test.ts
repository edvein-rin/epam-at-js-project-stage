/* global browser, page, context, jestPuppeteer */
import { ElementHandle } from 'puppeteer'

async function getProperty(property: string, selector: string): Promise<any> {
  return (await (await page.$(selector)).getProperty(property)).jsonValue()
}

async function getProperties(
  property: string,
  selector: string
): Promise<any[]> {
  return Promise.all(
    (await page.$$(selector)).map(
      async (element) => await (await element.getProperty(property)).jsonValue()
    )
  )
}

describe('BBC Part 1', () => {
  beforeAll(async () => {
    await page.goto('https://www.bbc.com/')
    const newsLinkHandle = await page.waitForSelector('.orb-nav-newsdotcom > a')
    await Promise.all([
      newsLinkHandle.evaluate((newsLinkElement: HTMLElement) =>
        newsLinkElement.click()
      ),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ])
  }, 100000)

  it('has the headline article with the hard-coded name', async () => {
    const headlineArticleNameExpected =
      'Belarus athlete told by grandmother not to return'

    // Getting headline article's name
    const headlineArticleSelector =
      'h3.gs-c-promo-heading__title.gel-paragon-bold.nw-o-link-split__text'
    const headlineArticleName: string = await getProperty(
      'innerText',
      headlineArticleSelector
    )
    // const headlineArticleName = await page.$eval(
    //   headlineArticleSelector,
    //   (element: HTMLElement) => {
    //     return element.innerText
    //   }
    // )

    expect(headlineArticleName).toBe(headlineArticleNameExpected)
  })

  it('has all the secondary titles from the hard-coded list', async () => {
    const secondaryTitlesExpected = [
      "USA's McLaughlin smashes 400m hurdles world record",
      'Belarus Olympic athlete flies out of Japan',
      "Gomez criticises 'tasteless' TV transplant joke",
      "UK takes France off 'amber-plus' list",
      'Rolling Stones drummer to miss US tour dates',
    ]

    // Getting secondary titles
    const secondaryTitlesSelector =
      '.nw-u-w-auto .gs-u-mt\\@m a.gs-c-promo-heading h3, .gs-u-pb-alt\\@m a.gs-c-promo-heading h3'
    const secondaryTitles: string[] = await getProperties(
      'innerText',
      secondaryTitlesSelector
    )

    secondaryTitlesExpected.forEach((titleExpected) =>
      expect(secondaryTitles).toContain(titleExpected)
    )
  })

  it('has the hard-coded name of the first article from the search with a query of a category link of the headline article', async () => {
    const firstArticleNameExpected = 'Reggie in China'

    // Getting the headline article's category
    const headlineArticleCategorySelector =
      '.gs-c-promo-body.gs-u-display-none .gs-c-section-link span'
    const headlineArticleCategoryName: string = await getProperty(
      'innerText',
      headlineArticleCategorySelector
    )

    // Writing category in the search bar input
    const searchBarInputSelector = 'input#orb-search-q'
    await page.$eval(
      searchBarInputSelector,
      (
        searchBarInputElement: HTMLInputElement,
        headlineArticleCategoryName: string
      ) => {
        searchBarInputElement.value = headlineArticleCategoryName
      },
      headlineArticleCategoryName
    )

    // Clicking search button and waiting until the page load
    const searchBarButtonSelector = 'button.orb-search__button'
    await Promise.all([
      page.$eval(
        searchBarButtonSelector,
        (searchBarButtonElement: HTMLButtonElement) => {
          searchBarButtonElement.click()
        }
      ),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ])

    // Getting a name of the first article
    const firstArticleSelector = 'a.ssrcss-ww5kby-PromoLink'
    const firstArticleName = await getProperty(
      'innerText',
      firstArticleSelector
    )

    expect(firstArticleName).toBe(firstArticleNameExpected)
  })
})

describe('BBC Part 2', () => {
  async function fillFormField(
    fieldHandle: ElementHandle,
    text: string
  ): Promise<void> {
    await fieldHandle.evaluate(async (fieldElement: HTMLElement) => {
      fieldElement.focus()
    })
    await page.keyboard.type(text)
  }

  async function fillForm(
    question: string,
    name: string,
    email: string,
    accept: boolean,
    location?: string,
    number?: string
  ) {
    if (question) {
      const questionFieldHandle = await page.$(
        "textarea[placeholder='What questions would you like us to answer?']"
      )
      await fillFormField(questionFieldHandle, question)
    }

    if (name) {
      const nameFieldHandle = await page.$("input[placeholder='Name']")
      await fillFormField(nameFieldHandle, name)
    }

    if (email) {
      const emailFieldHandle = await page.$("input[placeholder='Email address'")
      await fillFormField(emailFieldHandle, email)
    }

    if (location) {
      const locationFieldHandle = await page.$("input[placeholder='Location ']")
      await fillFormField(locationFieldHandle, location)
    }

    if (number) {
      const numberFieldHandle = await page.$(
        "input[placeholder='Contact number']"
      )
      await fillFormField(numberFieldHandle, number)
    }

    if (accept) {
      const checkboxHandle = await page.$('label input')
      await checkboxHandle.evaluate((checkboxElement: HTMLInputElement) =>
        checkboxElement.click()
      )
    }
  }

  async function sendForm() {
    const sendButtonSelector = 'button.button'
    await page.$eval(
      sendButtonSelector,
      (sendButtonElement: HTMLButtonElement) => sendButtonElement.click()
    )
  }

  async function hasFormErrorMessages(): Promise<boolean> {
    const errorSelector =
      '.embed-content-container > div > div.input-error-message, .text-input--error div, .checkbox div.input-error-message'
    return (await page.$(errorSelector)) !== null
  }

  beforeAll(async () => {
    await page.goto('https://www.bbc.com/news/52143212')

    // Reloading page for popup to disappear
    await page.reload({ waitUntil: ['networkidle2', 'domcontentloaded'] })
  })

  test("Submission didn't work with an empty question", async () => {
    await fillForm('', 'Name', 'Email', true)
    await sendForm()
    // Waiting for form to become sent
    await new Promise((resolve) => setTimeout(resolve, 500))
    const formHasErrorMessages: boolean = await hasFormErrorMessages()

    expect(formHasErrorMessages).toBe(true)
  })

  test("Submission didn't work with an empty name", async () => {
    await fillForm('Question', '', 'Email', true)
    await sendForm()
    // Waiting for form to become sent
    await new Promise((resolve) => setTimeout(resolve, 500))
    const formHasErrorMessages: boolean = await hasFormErrorMessages()

    expect(formHasErrorMessages).toBe(true)
  })

  test("Submission didn't work with an empty email", async () => {
    await fillForm('Question', 'Name', '', true)
    await sendForm()
    // Waiting for form to become sent
    await new Promise((resolve) => setTimeout(resolve, 500))
    const formHasErrorMessages: boolean = await hasFormErrorMessages()

    expect(formHasErrorMessages).toBe(true)
  })

  test("Submission didn't work with an uncomfirmed checkbox", async () => {
    await fillForm('Question', 'Name', 'Email', false)
    await sendForm()
    // Waiting for form to become sent
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const formHasErrorMessages: boolean = await hasFormErrorMessages()

    expect(formHasErrorMessages).toBe(true)
  })
})
