import { GenericDomScraper } from './GenericDomScraper';

describe('GenericDomScraper', () => {
  it('extracts ingredients from a plain list after an Ingredients heading', async () => {
    const html = `
      <html>
        <head><title>Colorful Cabbage Salad Recipe</title></head>
        <body>
          <h1 class="entry-title">Colorful Cabbage Salad</h1>
          <div class="entry-content">
            <p><strong>Ingredients:</strong></p>
            <ul>
              <li>1 1/2 cups frozen shelled edamame</li>
              <li>2 cups red cabbage, thinly sliced</li>
              <li>2 Tbsp. fresh lime juice</li>
            </ul>
            <p><strong>Method:</strong></p>
            <p>Whisk together the honey and lime juice.</p>
            <p>Toss with the vegetables and serve.</p>
          </div>
        </body>
      </html>
    `;

    const scraper = new GenericDomScraper();
    const recipe = await scraper.scrape(html, 'https://www.gimmesomeoven.com/colorful-cabbage-salad/', 'gimmesomeoven.com');

    expect(recipe).not.toBeNull();
    expect(recipe?.title).toBe('Colorful Cabbage Salad');
    expect(recipe?.rawData?.ingredients).toHaveLength(3);
    expect(recipe?.rawData?.ingredients[0]).toContain('edamame');
    expect(recipe?.rawData?.ingredients[2]).toContain('lime');
    expect(recipe?.rawData?.instructions?.length).toBeGreaterThanOrEqual(1);
  });
});

