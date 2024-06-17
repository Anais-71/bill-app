/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent, toHaveClass } from "@testing-library/dom"
import '@testing-library/jest-dom'
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import TestedClass from '../containers/Bills.js';
import mockStore from "../__mocks__/store"
import { formatStatus } from "../app/format.js";
import { formatDate } from "../app/format.js";

import router from "../app/Router.js";
jest.mock("../app/store", () => mockStore)

// Mocking Bootstrap modal
$.fn.modal = jest.fn();

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon).toHaveClass('active-icon')
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then new bill button should be clickable", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const newBillButton = screen.getByTestId("btn-new-bill");
      const mockHandleClickNewBill = jest.fn();
      newBillButton.addEventListener('click', mockHandleClickNewBill)
      fireEvent.click(newBillButton)
      expect(mockHandleClickNewBill).toHaveBeenCalled()
    })

    test("Then bills should be clickable", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const eyeIcons = document.querySelectorAll('div[data-testid="icon-eye"]');
      eyeIcons.forEach(icon => {
        const mockHandleClickIconEye = jest.fn();
        icon.addEventListener('click', mockHandleClickIconEye)
        fireEvent.click(icon)
        expect(mockHandleClickIconEye).toHaveBeenCalled()
      })
    })
  })
  describe("when I click on new bill button", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(
        window,
        'localStorage',
        { value: localStorageMock }
      )
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })
    test("Then I should be redirected to New Bill page", () => {
      const onNavigate = jest.fn();
      const document = {
        querySelector: jest.fn().mockReturnValue({
          addEventListener: jest.fn().mockImplementation((event, handler) => {
            if (event === 'click') {
              handler();
            }
          }),
          click: jest.fn(),
        }),
        querySelectorAll: jest.fn().mockReturnValue([{
          addEventListener: jest.fn(),
        }]),
      };
      const instance = new TestedClass({
        document: document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: localStorageMock
      })
      document.querySelector(`button[data-testid="btn-new-bill"]`).click();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill'])
    })

  describe("when I click on eye icon", () => {
    test("Then the modal should be displayed with the bill image", () => {
      const document = {
        querySelector: jest.fn().mockReturnValue({
          getAttribute: jest.fn().mockReturnValue('url-of-the-bill'),
          addEventListener: jest.fn().mockImplementation((event, handler) => {
            if (event === 'click') {
              handler();
            }
          }),
          click: jest.fn(),
          innerHTML: `<div style='text-align: center;' class="bill-proof-container"><img width=50 src=url-of-the-bill alt="Bill" /></div>`
        }),
        querySelectorAll: jest.fn().mockReturnValue([{
          getAttribute: jest.fn().mockReturnValue('url-of-the-bill'),
          addEventListener: jest.fn().mockImplementation((event, handler) => {
            if (event === 'click') {
              handler();
            }
          }),
          click: jest.fn(),
          innerHTML: `<div style='text-align: center;' class="bill-proof-container"><img width=50 src=url-of-the-bill alt="Bill" /></div>`
        }]),
      };
      const onNavigate = jest.fn();
      const instance = new TestedClass({
        document: document,
        onNavigate: onNavigate,
        store: mockStore,
        localStorage: localStorageMock
      })
      const eyeIcons = document.querySelectorAll(`div[data-testid="icon-eye"]`);
      eyeIcons.forEach(icon => icon.click());
      eyeIcons.forEach(icon => {
        expect(document.querySelector('#modaleFile').innerHTML).toEqual(`<div style='text-align: center;' class="bill-proof-container"><img width=50 src=url-of-the-bill alt="Bill" /></div>`);
      });
    })
  });
})
})

//getBills 
describe("Given I am a user connected", () => {
  describe("When I am an Employee and I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByText("Mes notes de frais"))

      const getBills = async () => {
        return bills.map(bill => ({
         ...bill,
          formattedDate: formatDate(bill.date), // add a new property for the formatted date
          status: formatStatus(bill.status)
        }));
      }

      const billsData = await getBills();
      expect(billsData[0].formattedDate).toEqual('4 Avr. 04');
      expect(billsData[1].formattedDate).toEqual('3 Mar. 03');
      expect(billsData[2].formattedDate).toEqual('2 Fév. 02');
      expect(billsData[3].formattedDate).toEqual('1 Jan. 01');
    })

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
        Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
        )
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee',
          email: "a@a"
        }))
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })

      test("fetches messages from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 404"))
            }
          }})
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/erreur 404/i);
        expect(message).toBeTruthy()
      })
      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 500"))
            }
          }})
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/erreur 500/i);
        expect(message).toBeTruthy()
      })            
      
    })
  })
})
