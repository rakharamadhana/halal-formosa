describe('App Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for page content
    cy.get('ion-content', { timeout: 10000 }).should('exist');
  })

  it('Loads home and shows search', () => {
    cy.get('ion-searchbar').shadow().find('input').should('exist');
  })

  it('Search filters results', () => {
    cy.get('ion-searchbar').shadow().find('input').type('Potato');
    cy.wait(1200); // for debounce

    cy.get('ion-item').should('contain.text', 'Potato');
  })

  it('Opens and closes product modal', () => {
    cy.get('ion-item').first().click();

    cy.get('ion-modal').should('have.attr', 'aria-hidden', 'false');

    cy.get('ion-button').contains('Close').click();

    cy.get('ion-modal').should('have.attr', 'aria-hidden', 'true');
  })

  it('Starts and stops barcode scanner', () => {
    cy.get('ion-button[aria-label="Scan barcode"]').click();
    cy.get('#reader').should('exist');
    cy.get('ion-button').contains('Stop Scan').click();
    cy.get('#reader').should('not.exist');
  })

  it('Can add new product', () => {
    cy.visit('/add');
    cy.get('ion-input[label="Barcode"]').shadow().find('input').type('1234567890123');
    cy.get('ion-input[label="Product Name"]').shadow().find('input').type('Test Product');
    cy.get('ion-select').click();
    cy.get('ion-select-option').contains('Halal').click();
    cy.get('ion-textarea[label="Ingredients"]').shadow().find('textarea').type('Emulsifier, Pork');
    cy.get('ion-textarea[label="Description"]').shadow().find('textarea').type('Test Description');
    cy.get('ion-button[type="submit"]').click();
    cy.get('ion-toast').should('contain.text', 'Product submitted successfully!');
  })
})
