const fxckedUpBags = await prisma.book.create({
    data: {
      title: 'FxckedUpBags',
      description: 'A book description...',
      priceTon: 1,
      priceCard: 3,
      tappingRate: 5,
      stockLimit: 5000,  // Set the stock limit to 5000
    },
  });
  
  const humanRelations = await prisma.book.create({
    data: {
      title: 'Human Relations',
      description: 'Another book description...',
      priceTon: 1,
      priceCard: 3,
      tappingRate: 2,
      stockLimit: 7000,  // Set the stock limit to 7000
    },
  });
  