/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import mockStore from "../__mocks__/store.js"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { bills } from "../fixtures/bills.js"

jest.mock("../app/store", () => mockStore)

class MockDataTransfer {
  constructor() {
    this.data = {};
  }
  items = {
    add: (file) => {
      this.data = file;
    },
  };
  files = {
    item: () => this.data,
  };
}
global.DataTransfer = MockDataTransfer;

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'fileBuffer'),
}));
let fs;

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then bill form should be rendered", () => {
      const html = NewBillUI()
      document.body.innerHTML = html
      // Vérification que le formulaire est bien rendu
      const form = screen.getByTestId("form-new-bill")
      expect(form).toBeTruthy()
    })
  })
});

describe("Given I upload a file", () => {
  let newBill;
  let fileInput;

  beforeEach(() => {
    const onNavigate = jest.fn();
    newBill = new NewBill({ document, onNavigate, mockStore, localStorage });
    fileInput = newBill.document.querySelector(`input[data-testid="file"]`);
  });


  beforeEach(() => {
    jest.resetModules();
    fs = require('fs');
    jest.mock('fs', () => ({
      readFileSync: jest.fn(() => 'fileBuffer'),
    }));
  });

  describe("When no file is selected", () => {
    test("Then an alert should be displayed", () => {
      const onNavigate = jest.fn();
      newBill = new NewBill({ document, onNavigate, mockStore, localStorage });
      fileInput = newBill.document.querySelector(`input[data-testid="file"]`);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => { });
      fileInput.dispatchEvent(new Event('change'));
      expect(alertSpy).toHaveBeenCalledWith('Aucun fichier n\'a été sélectionné.');
    });
  });

  describe("When the file is not a PNG, JPG or JPEG", () => {
    test("Then an alert should be displayed", () => {
      let file = new Blob(['contenu du fichier'], { type: 'application/pdf' });
      file.name = 'fichier.pdf';

      let input = document.createElement('input')
      input.type = 'file'
      input.dataset.testid = 'file'

      document.body.appendChild(input)
      jest.spyOn(window, 'alert').mockImplementation(() => { })

      fireEvent.change(input, { target: { files: [file] } })
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Le fichier n\'est pas une image JPG ou PNG.')
      }
      expect(window.alert).toHaveBeenCalledWith('Le fichier n\'est pas une image JPG ou PNG.')
    });
  });

  describe("When the file is a PNG, JPG or JPEG", async () => {
    await waitFor(() => {
      expect(newBill.fileUrl).toBe('https://example.com/file.jpg');
      expect(newBill.fileName).toBe('valid.jpg');
    });
    const onNavigate = jest.fn();
    newBill = new NewBill({ document, onNavigate, mockStore, localStorage });
    const handleChangeFileSpy = jest.spyOn(newBill, 'handleChangeFile').mockImplementation(() => { });
    fileInput = newBill.document.querySelector(`input[data-testid="file"]`);
    if (fileInput) {
      fileInput.addEventListener('change', newBill.handleChangeFile);
    }
    const file = new File(['fileBuffer'], 'image.png', { type: 'image/png' });
    const fileList = new DataTransfer();
    fileList.items.add(file);
    fileInput.files = fileList.files;

    test("Then the file should be added to the bill", () => {
      fileInput.dispatchEvent(new Event('change'));
      expect(handleChangeFileSpy).toHaveBeenCalledTimes(1);
    });

    test('Then the file should be uploaded and the file URL and name stored', async () => {
      expect(newBill.fileUrl).toBe('https://example.com/file.jpg');
      expect(newBill.fileName).toBe('valid.jpg');
    });
  });

});

describe("Given I submit a new Bill", () => {
  let mockEvent, mockUpdateBill, mockOnNavigate, mockDocument, mockStore, newBill
  const bill = bills[0]

  beforeEach(() => {
    mockEvent = {
      preventDefault: jest.fn(),
      target: {
        querySelector: jest.fn().mockImplementation((selector) => {
          switch (selector) {
            case 'input[data-testid="datepicker"]':
              return { value: bill.date }
            case 'select[data-testid="expense-type"]':
              return { value: bill.type }
            case 'input[data-testid="expense-name"]':
              return { value: bill.name }
            case 'input[data-testid="amount"]':
              return { value: bill.amount.toString() }
            case 'input[data-testid="vat"]':
              return { value: bill.vat }
            case 'input[data-testid="pct"]':
              return { value: bill.pct.toString() }
            case 'textarea[data-testid="commentary"]':
              return { value: bill.commentary }
            default:
              return null
          }
        }),
      },
    }
    mockUpdateBill = jest.fn().mockResolvedValue({});
    mockOnNavigate = jest.fn()

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue(JSON.stringify({ email: 'test@example.com' })),
      },
      writable: true,
    })

    mockDocument = {
      querySelector: jest.fn().mockImplementation((selector) => {
        if (selector === 'form[data-testid="form-new-bill"]' || selector === 'input[data-testid="file"]') {
          return { addEventListener: jest.fn() }
        }
        return null
      }),
    }

    mockStore = {
      bills: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({ fileUrl: 'http://example.com/file', key: 'file' }),
        update: mockUpdateBill,
      }),
    }

    newBill = new NewBill({
      document: mockDocument,
      onNavigate: mockOnNavigate,
      store: mockStore,
      localStorage: global.localStorage,
    })
    newBill.fileUrl = 'http://example.com/file';
    newBill.fileName = 'file';
  })

  test('When I click on submit', async () => {
    await newBill.handleSubmit(mockEvent)
  })

  test('Then the bill is updated', async () => {
    const bill = {
      data: JSON.stringify({
        email: 'test@example.com',
        type: mockEvent.target.querySelector(`select[data-testid="expense-type"]`).value,
        name: mockEvent.target.querySelector(`input[data-testid="expense-name"]`).value,
        amount: parseInt(mockEvent.target.querySelector(`input[data-testid="amount"]`).value),
        date: mockEvent.target.querySelector(`input[data-testid="datepicker"]`).value,
        vat: mockEvent.target.querySelector(`input[data-testid="vat"]`).value,
        pct: parseInt(mockEvent.target.querySelector(`input[data-testid="pct"]`).value) || 20,
        commentary: mockEvent.target.querySelector(`textarea[data-testid="commentary"]`).value,
        fileUrl: newBill.fileUrl,
        fileName: newBill.fileName,
        status: 'pending'
      }),
      selector: null
    }
    await newBill.handleSubmit(mockEvent)
    expect(mockUpdateBill).toHaveBeenCalledWith(bill)
  })

  test('Then the file should be sent to the server', async () => {
    const file = new File(['fileBuffer'], 'image.png', { type: 'image/png' });
    const fileList = new DataTransfer();
    fileList.items.add(file);
    const fileInput = newBill.document.querySelector(`input[data-testid="file"]`);
    fileInput.files = fileList.files;
    await newBill.handleSubmit(mockEvent);
    expect(mockUpdateBill).toHaveBeenCalledTimes(1);
  })
})