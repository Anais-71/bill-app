export default class MockDataTransfer {
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