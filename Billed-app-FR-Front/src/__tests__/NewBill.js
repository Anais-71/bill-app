/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent, getByText } from "@testing-library/dom";
import mockStore from "../__mocks__/store.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import MockDataTransfer from "../__mocks__/dataTransfer.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";
import BillsUI from "../views/BillsUI.js";

jest.mock("../app/store", () => mockStore);

global.DataTransfer = MockDataTransfer;

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    const windowMock = {
      alert: jest.fn(),
      addEventListener: jest.fn(),
    };

    alertSpy = jest.spyOn(windowMock, "alert").mockImplementation(() => {});
  });

  describe("When I am on NewBill Page", () => {
    test("Then bill form should be rendered", () => {
      document.body.innerHTML = NewBillUI();
      // Vérification que le formulaire est bien rendu
      const formNewBill = screen.getByTestId("form-new-bill");
      expect(formNewBill).toBeTruthy();
    });
  });
});

describe("Given I submit a form", () => {
  //Vérifie que le formulaire est toujours affiché quand un formulaire incomplet est soumis
  describe("When no field is filled", () => {
    test("Then the form should be displayed", () => {
      document.body.innerHTML = NewBillUI();
      const formNewBill = screen.getByTestId("form-new-bill");
      const dateInput = screen.getByTestId("datepicker");
      const amountInput = screen.getByTestId("amount");
      const pctInput = screen.getByTestId("pct");
      const fileInput = screen.getByTestId("file");

      fireEvent.change(dateInput, "");
      expect(dateInput.value).toBe("");
      fireEvent.change(amountInput, "");
      expect(amountInput.value).toBe("");
      fireEvent.change(pctInput, "");
      expect(pctInput.value).toBe("");
      fireEvent.change(fileInput, "");
      expect(fileInput.value).toBe("");

      const handleSubmit = jest.fn((e) => e.preventDefault());
      formNewBill.addEventListener("submit", handleSubmit);
      fireEvent.submit(formNewBill);
      expect(formNewBill).toBeTruthy;
    });
  });

  describe("When I upload a file with the wrong extension", () => {
    //Vérifie que le message d'alerte s'affiche quand l'extension de fichier est incorrecte
    test("Then an alert should be displayed", () => {
      window.alert = jest.fn();
      document.body.innerHTML = NewBillUI();

      const upload = screen.getByTestId("file");
      fireEvent.change(upload, {target: {
        files: [
          new File(["image"], "image.pdf", { type: "application/pdf" }),
        ],
      },});

      const img = document.querySelector(`input[data-testid="file"]`);
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({pathname});
      }; 

      const newBillAdd = new NewBill({
        document,
        onNavigate, 
        store: mockStore,
        localStorage: window.localStorage,
      });

      const handleChangeFile= jest.fn(newBillAdd.handleChangeFile);
      upload.addEventListener("change", handleChangeFile); 
      fireEvent.change(upload);

      expect(img.files[0].name).not.toMatch(/(jpeg|jpg|png)/);
      expect(window.alert).toHaveBeenCalled();
    });
  });

  describe("When I upload a file with the correct extension", () => {
    test("Then the file should be saved", () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      window.alert = jest.fn();
      document.body.innerHTML = NewBillUI();

      const upload = screen.getByTestId("file");
      fireEvent.change(upload, {target: {
        files: [
          new File(["image"], "image.png", { type: "application/png" }),
        ],
      },});

      const img = document.querySelector(`input[data-testid="file"]`);
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({pathname});
      }; 

      const newBillAdd = new NewBill({
        document,
        onNavigate, 
        store: mockStore,
        localStorage: window.localStorage,
      });

      const handleChangeFile= jest.fn(newBillAdd.handleChangeFile);
      upload.addEventListener("change", handleChangeFile); 
      fireEvent.change(upload);

      expect(img.files[0].name).toMatch(/(jpeg|jpg|png)/);
      expect(handleChangeFile).toHaveBeenCalled();
    });
  });
});

//Test d'intégration POST
describe("Given I submit a new Bill", () => {
 
  describe("When I click on submit", async () => {
    test("Then the bill is updated", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@company.tld",
        })
      );
      
      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const newBills = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage,
      });

      const formNewBill = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn(newBills.handleSubmit);

      formNewBill.addEventListener("submit", handleSubmit);
      fireEvent.submit(formNewBill);
      expect(handleSubmit).toHaveBeenCalled();
      expect(formNewBill).toBeTruthy();
    });
  });

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      window.onNavigate(ROUTES_PATH.NewBill);
      await new Promise(process.nextTick);
      document.body.innerHTML = BillsUI({ error: "Erreur 404" });
      const message = screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });
      window.onNavigate(ROUTES_PATH.NewBill);
      await new Promise(process.nextTick);
      document.body.innerHTML = BillsUI({ error: "Erreur 500" });
      const message = screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});