import { indexBooks } from '@/actions/search';

const main = async () => {
    console.log('Starting indexing process...');

    await indexBooks('shamela');

    console.log('Indexing complete!');
};

main().catch(console.error);
