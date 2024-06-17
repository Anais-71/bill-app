/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom"
import mockStore from "../__mocks__/store.js"
import NewBill from "../containers/NewBill.js"
import { localStorageMock } from '../__mocks__/localStorage.js'
import { ROUTES } from '../constants/routes'

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
    describe("When I am on NewBill Page and I add a file", () => {
      test("Then file should be added", () => {
        // Mock du HTML
        document.body.innerHTML = `
            <div>
              <form data-testid="form-new-bill">
                <input data-testid="file" type="file" />
              </form>
            </div>
          `;
  
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
  
        // Mock du store
        const firestore = null
        const store = {
          bills: jest.fn().mockReturnValue({
            create: jest.fn().mockResolvedValue({ fileUrl: 'url', key: 'key' }),
          }),
        }
  
        // Mock de localStorage
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: jest.fn(() => JSON.stringify({ type: 'Employee', email: 'employee@billed.com' })),
            setItem: jest.fn(() => null)
          },
          writable: true
        });
  
        const newBill = new NewBill({
          document, onNavigate, firestore, store, localStorage: window.localStorage
        })
  
        const handleChangeFile = jest.fn(newBill.handleChangeFile)
        const inputFile = screen.getByTestId("file")
        inputFile.addEventListener('change', handleChangeFile)
        fireEvent.change(inputFile, {
          target: {
            files: [new File(['file'], 'file.png', { type: 'image/png' })],
          },
        })
        expect(handleChangeFile).toHaveBeenCalled()
        expect(inputFile.files[0]).toStrictEqual(new File(['file'], 'file.png', { type: 'image/png' }))
      })
    })
  });  

