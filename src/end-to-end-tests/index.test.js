/*

This file contains so called end-to-end tests.
These are tests that use use the application as a user would, i.e. it
should depend on as few implementation details as possible.
That way, the tests require minimal refactorings when the app itself is
refactored and even re-architectured.

We want the tests in the separate files to have access to all the helper functions
defined here without verbose exporting. That's why we put helper functions in
the global object

*/

// Set to true if you want to have time to observe what the tests
// are doing
const SLOW_DOWN_FOR_HUMAN_OBSERVATION = !!process.env
  .SLOW_DOWN_FOR_HUMAN_OBSERVATION;

// Default to headless testing when running in Continous Integration environments
const HEADLESS = !!process.env.CI && !SLOW_DOWN_FOR_HUMAN_OBSERVATION;

global.applyTimeoutFactor = function(timeout) {
  const factor = SLOW_DOWN_FOR_HUMAN_OBSERVATION ? 4 : 1;
  return timeout * factor;
};

jasmine.DEFAULT_TIMEOUT_INTERVAL = applyTimeoutFactor(10 * 1000);

let {
  logging,
  Builder,
  By,
  until,
  Key,
  promise,
} = require('selenium-webdriver');
let { Options } = require('selenium-webdriver/chrome');

const lib = require('./lib');
const { getSchemeAndHost, getPort } = lib;

global.Key = Key;
global.logging = logging;

let options = new Options();
let args = ['window-size=1280,1050'];
if (HEADLESS) {
  args = args.concat(['headless', 'disable-gpu']);
}
options.addArguments(...args);
const prefs = new logging.Preferences();
// So we can test the we don't forget debug logs
prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
options.setLoggingPrefs(prefs);
global.driver = new Builder()
  .forBrowser('chrome')
  .setChromeOptions(options)
  .build();

global.SPromise = promise.Promise;

afterAll(() => {
  return driver.quit();
});

// Helper functions

global.waitForCssTransitions = async function(driver) {
  return driver.sleep(300);
};

global.sleepIfHumanObserver = async function(driver, seconds) {
  if (!SLOW_DOWN_FOR_HUMAN_OBSERVATION) {
    return true;
  }

  return driver.sleep(seconds * 1000);
};

global.getTextCenterPos = async function(driver, text) {
  const el = await findElementByText(driver, text);
  const pos = await el.getLocation();
  const size = await el.getSize();
  return { x: pos.x + size.width / 2, y: pos.y + size.height / 2 };
};

global.reversePromise = function(promise) {
  return new SPromise((resolve, reject) => {
    promise.then(reject).catch(resolve);
  });
};

function byText(text) {
  return By.xpath("//*[contains(text(),'" + text + "')]");
}

global.waitForElement = async function(driver, text) {
  const locator = byText(text);
  return driver.wait(until.elementLocated(locator), 2000);
};

global.findElementByText = async function(driver, text) {
  const locator = byText(text);
  await waitForElement(driver, text);
  return driver.findElement(locator);
};

global.mouseMoveInSteps = async function(driver, totalOffset) {
  const steps = 20;
  let i = steps;
  while (i > 0) {
    i--;
    // Steps must be ints, otherwise WebDriver pukes
    const offsetStep = {
      x: Math.ceil(totalOffset.x / steps),
      y: Math.ceil(totalOffset.y / steps),
    };
    await driver
      .actions()
      .mouseMove(offsetStep)
      .perform();
    await sleepIfHumanObserver(driver, 1.5 / steps);
  }
  return true;
};

global.dragAndDrop = async function(driver, elementText, offset) {
  await driver
    .actions()
    .mouseDown(await findElementByText(driver, elementText))
    .perform();
  await sleepIfHumanObserver(driver, 0.7);

  await mouseMoveInSteps(driver, offset);

  await driver
    .actions()
    .mouseUp()
    .perform();
  return sleepIfHumanObserver(driver, 0.7);
};

global.clickText = async function(driver, elementText) {
  return clickElement(driver, await findElementByText(driver, elementText));
};

async function clickElement(driver, element) {
  await driver
    .actions()
    .click(element)
    .perform();
  return waitForCssTransitions(driver);
}

global.typeTextAndPressReturn = async function(driver, typedText) {
  await typeText(driver, typedText);
  return driver
    .actions()
    .sendKeys(Key.RETURN)
    .perform();
};

global.typeText = async function(driver, typedText) {
  await driver
    .actions()
    .sendKeys(typedText)
    .perform();
};

global.clickAndType = async function(driver, elementText, typedText) {
  await clickText(driver, elementText);
  await typeTextAndPressReturn(driver, typedText);
  return waitForCssTransitions(driver);
};

global.assertFragment = async function(driver, expected) {
  await sleepIfHumanObserver(driver, 0.7);
  return new SPromise((resolve, reject) => {
    driver
      .getCurrentUrl()
      .then(url => {
        const fragment = url.substring(url.indexOf('#') + 1);
        if (fragment === expected) {
          resolve();
        } else {
          const msg = 'expected: ' + expected + ' got: ' + fragment;
          reject(msg);
        }
      })
      .catch(e => console.log(e));
  });
};

global.urlParsing = function(driver, url, expected) {
  return async () => {
    await goTo(driver, url);
    return assertFragment(driver, expected ? expected : url);
  };
};

global.goTo = async function(driver, startState) {
  // When no fragment is requsted, make sure to not even include '#'
  const fragment = startState ? '#' + startState : '';
  await driver.get(`${getSchemeAndHost()}:${getPort()}/${fragment}`);
  /* We use 0.3 second CSS transitions, so make sure those have
     * settled before we move on.
     */
  return waitForCssTransitions(driver);
};

global.move = function(
  driver,
  startState,
  grabbedText,
  toMove,
  expectedEndState
) {
  return async () => {
    await goTo(driver, startState);
    await dragAndDrop(driver, grabbedText, toMove);
    return assertFragment(driver, expectedEndState);
  };
};

global.clickLifelineForObjectWithText = async function(driver, objectText) {
  await driver
    .actions()
    .mouseMove(await findElementByText(driver, objectText), { x: 30, y: 100 })
    .click()
    .perform();
  await waitForCssTransitions(driver);
  return sleepIfHumanObserver(driver, 0.7);
};

global.clickAddObject = async function(driver) {
  await clickText(driver, 'Add object');
  await waitForCssTransitions(driver);
  return sleepIfHumanObserver(driver, 0.7);
};

global.addMessage = async function(driver, sender, receiver) {
  const startEl = await findElementByText(driver, sender);
  const endEl = await findElementByText(driver, receiver);
  const startLoc = await startEl.getLocation();
  const endLoc = await endEl.getLocation();
  const fromObjectNameToLifelineOffset = { x: 30, y: 70 };

  await driver
    .actions()
    .mouseMove(startEl, fromObjectNameToLifelineOffset)
    .click()
    .perform();
  await sleepIfHumanObserver(driver, 0.7);

  await mouseMoveInSteps(driver, calcOffset(startLoc, endLoc));

  await driver
    .actions()
    .click()
    .perform();
  return sleepIfHumanObserver(driver, 0.7);
};

function calcOffset(startLoc, endLoc) {
  return { x: endLoc.x - startLoc.x, y: endLoc.y - startLoc.y };
}

global.moveAnchorPointToActor = async function(
  driver,
  messageKey,
  anchorPointType,
  actorName
) {
  // Low prio todo: Stop depending on the implementation detail that messages have
  // anchor point buttons with certain IDs without complicating testing code too much
  const messageAnchorPointEl = await driver.findElement(
    By.id(messageKey + '-' + anchorPointType)
  );
  const actorNameEl = await findElementByText(driver, actorName);
  const messageAnchorPointLoc = await messageAnchorPointEl.getLocation();
  const actorNameLoc = await actorNameEl.getLocation();
  let offsetToMove = calcOffset(messageAnchorPointLoc, actorNameLoc);
  offsetToMove.y = 0;

  await driver
    .actions()
    .click(messageAnchorPointEl)
    .perform();
  await mouseMoveInSteps(driver, offsetToMove);
  await driver
    .actions()
    .click()
    .perform();
};

global.flip = async function(driver, id) {
  // Low prio todo: Stop depending on the implementation detail that messages have
  // flip buttons with certain IDs without complicating testing code too much
  await driver
    .actions()
    .click(await driver.findElement(By.id('flip-' + id)))
    .perform();
  return sleepIfHumanObserver(driver, 0.7);
};

global.toggleArrowStyle = async function(driver, id) {
  // Low prio todo: Stop depending on the implementation detail that messages have
  // toggle buttons with certain IDs without complicating testing code too much
  await driver
    .actions()
    .click(await driver.findElement(By.id('toggle-arrow-style-' + id)))
    .perform();
  return sleepIfHumanObserver(driver, 0.7);
};

global.toggleLineStyle = async function(driver, id) {
  // Low prio todo: Stop depending on the implementation detail that messages have
  // toggle buttons with certain IDs without complicating testing code too much
  await driver
    .actions()
    .click(await driver.findElement(By.id('toggle-line-style-' + id)))
    .perform();
  return sleepIfHumanObserver(driver, 0.7);
};

global.removeComponentWithKey = async function(driver, id) {
  // Low prio todo: Stop depending on the implementation detail that components have
  // remove buttons with certain IDs without complicating testing code too much
  await driver
    .actions()
    .click(await driver.findElement(By.id('remove-' + id)))
    .perform();
  return waitForCssTransitions(driver);
};

const filesWithTests = [
  'move-object.js',
  'add-object.js',
  'remove-object.js',
  'misc-object.js',
  'move-message.js',
  'add-message.js',
  'remove-message.js',
  'change-message-appearance.js',
  'misc.js',
  'undo-redo.js',
  'serialize-and-deserialize.js',
];

filesWithTests.forEach(file => {
  describe(file, () => {
    require('./' + file);
  });
});

it('no browser log output', async () => {
  const okEntries = [
    'Download the React DevTools for a better development experience',
    'Content is cached for offline use.',
    'New content is available; please refresh.',
  ];

  let logEntries = await driver
    .manage()
    .logs()
    .get(logging.Type.BROWSER);

  logEntries = logEntries.filter(entry => {
    let wasOk = false;
    okEntries.forEach(okEntry => {
      wasOk |= entry.message.indexOf(okEntry) >= 0;
    });
    return !wasOk;
  });

  expect(logEntries).toEqual([]);
});
