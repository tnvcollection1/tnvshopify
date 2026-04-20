import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'TNV Collection — Premium Footwear & Apparel'},
    {
      name: 'description',
      content:
        'Shop the new summer collection. Fresh styles, premium comfort. Curated footwear and apparel from TNV Collection.',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
  ]);
  return {
    featuredCollection: collections.nodes[0],
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });
  return {recommendedProducts};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="tnv-home">
      <AnnouncementBar />
      <Hero collection={data.featuredCollection} />
      <TrendingNow products={data.recommendedProducts} />
      <ValueProps />
    </div>
  );
}

function AnnouncementBar() {
  return (
    <div
      style={{
        background: '#212529',
        color: '#fff',
        textAlign: 'center',
        fontSize: 13,
        padding: '10px 16px',
        letterSpacing: '0.02em',
      }}
    >
      Flat 30% off orders above Rs.5,000. Discount automatically applied at
      checkout.{' '}
      <a
        href="/pages/exclusions"
        style={{color: '#fff', textDecoration: 'underline'}}
      >
        *Exclusions apply.
      </a>
    </div>
  );
}

function Hero({collection}: {collection?: FeaturedCollectionFragment}) {
  if (!collection) {
    return (
      <section className="tnv-hero">
        <div className="tnv-hero-content">
          <h1>The New Summer Collection</h1>
          <p>Fresh Styles. Premium Comfort. Shop Now.</p>
          <Link to="/collections" className="tnv-btn-primary">
            Shop Collections
          </Link>
        </div>
      </section>
    );
  }
  const image = collection?.image;
  return (
    <Link
      className="tnv-hero tnv-hero-linked"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="tnv-hero-image">
          <Image data={image} sizes="100vw" alt={image.altText || collection.title} />
        </div>
      )}
      <div className="tnv-hero-content">
        <h1>{collection.title}</h1>
        <p>Fresh Styles. Premium Comfort. Shop Now.</p>
      </div>
    </Link>
  );
}

function TrendingNow({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section
      className="tnv-trending"
      aria-labelledby="trending-now"
      style={{padding: '64px 24px', maxWidth: 1440, margin: '0 auto'}}
    >
      <h2
        id="trending-now"
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '0.02em',
          marginBottom: 32,
          color: '#212529',
        }}
      >
        Trending Now
      </h2>
      <Suspense fallback={<div>Loading…</div>}>
        <Await resolve={products}>
          {(response) => (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 32,
              }}
            >
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
    </section>
  );
}

function ValueProps() {
  const items = [
    {title: 'Free Shipping', body: 'On orders above Rs.2,000'},
    {title: '30-Day Returns', body: 'Easy, hassle-free returns'},
    {title: 'Secure Checkout', body: 'Payments processed by Shopify'},
  ];
  return (
    <section
      style={{
        borderTop: '1px solid #e5e5e5',
        padding: '48px 24px',
        maxWidth: 1440,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 32,
        textAlign: 'center',
      }}
    >
      {items.map((i) => (
        <div key={i.title}>
          <h3 style={{fontSize: 14, fontWeight: 600, marginBottom: 4}}>
            {i.title}
          </h3>
          <p style={{fontSize: 13, color: '#767676'}}>{i.body}</p>
        </div>
      ))}
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image { id url altText width height }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes { ...FeaturedCollection }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    featuredImage { id url altText width height }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes { ...RecommendedProduct }
    }
  }
` as const;
