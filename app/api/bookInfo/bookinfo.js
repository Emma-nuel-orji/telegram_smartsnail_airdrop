// Centralized book data
export const books = {
    fxckedUpBags: {
        id: 'FxckedUpBags',
        title: 'FxckedUpBags (Undo Yourself)',
        stockLimit: 20000, // Replace with the actual stock limit for this book
      },
      humanRelations: {
        id: 'Human Relations',
        title: 'Human Relations',
        stockLimit: 30000, // Replace with the actual stock limit for this book
      },
    };
  
  /**
   * Helper function to calculate stock information
   * @param {Object} book - Book object containing stock limit and other details.
   * @param {Array} redeemedCodes - List of generated codes with their redemption status.
   * @returns {string} - Stock information in "used/total" format.
   */
  export const calculateStock = (book, redeemedCodes) => {
    const usedStock = redeemedCodes.filter((code) => code.isRedeemed).length;
    return `${usedStock}/${book.stockLimit}`;
  };
  
  /**
   * Helper function to fetch book data by ID
   * @param {string} id - The ID of the book to fetch.
   * @returns {Object | undefined} - Returns the book object or undefined if not found.
   */
  export const getBookById = (id) => {
    return Object.values(books).find((book) => book.id === id);
  };
  
  export const booksArray = Object.values(books);