// ============================================================================
// HOJAI VOICE PLATFORM - Voice Search Agent
// ============================================================================

import { BaseVoiceAgent, AgentConfig } from './base.agent';
import { IntentDefinition, SentimentScore, VoiceAgent } from '../types';

/**
 * Default intents for Voice Search Agent
 */
export const DEFAULT_VOICE_SEARCH_INTENTS: Omit<IntentDefinition, 'id'>[] = [
  {
    name: 'search',
    description: 'User wants to search for something',
    examples: [
      'find me a hotel', 'search for restaurants', 'look up flights',
      'find nearby hospitals', 'search for electricians'
    ],
    action: 'handleSearch',
    parameters: {
      query: { name: 'query', type: 'string', description: 'Search query' },
      location: { name: 'location', type: 'string', description: 'Location to search in' },
      category: { name: 'category', type: 'string', description: 'Business category' },
    },
  },
  {
    name: 'nearby',
    description: 'User wants to find nearby places',
    examples: [
      'nearby restaurants', 'what is near me', 'places near me',
      'closest pharmacy', 'ATM near me'
    ],
    action: 'handleNearby',
    parameters: {
      category: { name: 'category', type: 'string', description: 'Place category' },
      distance: { name: 'distance', type: 'number', description: 'Maximum distance in km' },
    },
  },
  {
    name: 'directions',
    description: 'User wants directions to a place',
    examples: [
      'how do I get there', 'give me directions', 'navigate to',
      'how far is it', 'show me the route'
    ],
    action: 'handleDirections',
    parameters: {
      destination: { name: 'destination', type: 'string', description: 'Destination address' },
      startLocation: { name: 'startLocation', type: 'string', description: 'Starting location' },
    },
  },
  {
    name: 'filter_results',
    description: 'User wants to filter search results',
    examples: [
      'filter by rating', 'show only open ones', 'sort by price',
      'filter by distance', 'only 4 star and above'
    ],
    action: 'handleFilterResults',
    parameters: {
      filterType: { name: 'filterType', type: 'enum', description: 'Filter type', allowedValues: ['rating', 'price', 'distance', 'availability', 'cuisine'] },
      value: { name: 'value', type: 'string', description: 'Filter value' },
    },
  },
  {
    name: 'view_details',
    description: 'User wants to see details of a search result',
    examples: [
      'tell me more', 'show details', 'what are the timings',
      'contact number', 'more information'
    ],
    action: 'handleViewDetails',
    parameters: {
      itemId: { name: 'itemId', type: 'string', description: 'Item/business ID' },
    },
  },
  {
    name: 'book_appointment',
    description: 'User wants to book an appointment',
    examples: [
      'book an appointment', 'schedule a visit', 'make a reservation',
      'book a table', 'reserve a slot'
    ],
    action: 'handleBookAppointment',
    parameters: {
      itemId: { name: 'itemId', type: 'string', description: 'Business ID' },
      date: { name: 'date', type: 'date', description: 'Appointment date' },
      time: { name: 'time', type: 'time', description: 'Appointment time' },
      partySize: { name: 'partySize', type: 'number', description: 'Number of people' },
    },
  },
  {
    name: 'call_business',
    description: 'User wants to call a business',
    examples: [
      'call them', 'dial the number', 'contact',
      'call the restaurant', 'phone'
    ],
    action: 'handleCallBusiness',
    parameters: {
      itemId: { name: 'itemId', type: 'string', description: 'Business ID' },
    },
  },
  {
    name: 'share_location',
    description: 'User wants to share or get location',
    examples: [
      'share my location', 'where am I', 'my location',
      'send my location', 'current address'
    ],
    action: 'handleShareLocation',
  },
  {
    name: 'save_favorite',
    description: 'User wants to save a place as favorite',
    examples: [
      'save this', 'add to favorites', 'bookmark',
      'save for later', 'add to wishlist'
    ],
    action: 'handleSaveFavorite',
    parameters: {
      itemId: { name: 'itemId', type: 'string', description: 'Item/business ID' },
    },
  },
  {
    name: 'greeting',
    description: 'User is greeting',
    examples: ['hello', 'hi', 'namaste', 'good morning'],
    action: 'handleGreeting',
    followUp: 'What would you like to search for?',
  },
  {
    name: 'goodbye',
    description: 'User is ending the conversation',
    examples: ['bye', 'goodbye', 'thanks', 'that is all'],
    action: 'handleGoodbye',
  },
];

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  rating: number;
  distance?: string;
  priceLevel?: number;
  address: string;
  phone?: string;
  isOpen?: boolean;
  imageUrl?: string;
}

export class VoiceSearchAgent extends BaseVoiceAgent {
  private searchResults: SearchResult[] = [];
  private filters: {
    rating?: number;
    priceLevel?: string;
    distance?: number;
    isOpen?: boolean;
  } = {};

  constructor(config: AgentConfig) {
    super(config);

    if (this.agent.intents.length === 0) {
      this.agent.intents = DEFAULT_VOICE_SEARCH_INTENTS.map((intent, idx) => ({
        ...intent,
        id: `vs_intent_${idx}`,
      }));
    }
  }

  protected async handleIntent(
    intent: IntentDefinition,
    parameters: Record<string, unknown>,
    sentiment: SentimentScore
  ): Promise<string> {
    switch (intent.action) {
      case 'handleSearch':
        return this.handleSearch(parameters);
      case 'handleNearby':
        return this.handleNearby(parameters);
      case 'handleDirections':
        return this.handleDirections(parameters);
      case 'handleFilterResults':
        return this.handleFilterResults(parameters);
      case 'handleViewDetails':
        return this.handleViewDetails(parameters);
      case 'handleBookAppointment':
        return this.handleBookAppointment(parameters);
      case 'handleCallBusiness':
        return this.handleCallBusiness(parameters);
      case 'handleShareLocation':
        return this.handleShareLocation();
      case 'handleSaveFavorite':
        return this.handleSaveFavorite(parameters);
      case 'handleGreeting':
        return this.handleGreeting();
      case 'handleGoodbye':
        return this.handleGoodbye();
      default:
        return this.handleUnknown();
    }
  }

  protected getAgentCapabilities(): string {
    return 'searching for places, finding nearby locations, getting directions, filtering results, and booking appointments';
  }

  private handleGreeting(): string {
    const greetings: Record<string, string> = {
      'en-IN': 'Namaste! I can help you search for places, find nearby locations, and get directions. What are you looking for?',
      'hi-IN': 'नमस्ते! मैं आपको जगहें खोजने, नज़दीकी स्थान खोजने और दिशा-निर्देश प्राप्त करने में मदद कर सकता हूं। आप क्या खोज रहे हैं?',
    };

    return greetings[this.session?.language || 'en-IN'] || greetings['en-IN'];
  }

  private handleSearch(parameters: Record<string, unknown>): string {
    const query = parameters.query || parameters.category || '';

    if (!query) {
      return `What would you like to search for? You can search for restaurants, hotels, shops, services, or any other place.`;
    }

    // In production, this would search a places API
    this.searchResults = this.generateMockResults(String(query));

    if (this.searchResults.length === 0) {
      return `I couldn't find any results for "${query}". Would you like to try a different search term?`;
    }

    const topResult = this.searchResults[0];
    const count = this.searchResults.length;

    return `I found ${count} results for "${query}". The top result is ${topResult.name}, rated ${topResult.rating} stars, located ${topResult.distance} away. Would you like me to tell you more about it, or refine your search?`;
  }

  private handleNearby(parameters: Record<string, unknown>): string {
    const category = parameters.category || 'restaurants';
    const distance = Number(parameters.distance || 5);

    // In production, this would use location services
    this.searchResults = this.generateMockResults(String(category));

    return `Found ${this.searchResults.length} ${category} within ${distance} kilometers. The closest one is ${this.searchResults[0]?.name || 'None'}, ${this.searchResults[0]?.distance || 'N/A'} away. Would you like more details?`;
  }

  private handleDirections(parameters: Record<string, unknown>): string {
    const destination = parameters.destination;
    const startLocation = parameters.startLocation || this.session?.context?.customData?.get('currentLocation');

    if (!destination) {
      return `To get directions, please specify where you want to go.`;
    }

    // In production, this would use a maps API
    return `The route to ${destination} from your current location is approximately 5 kilometers and should take about 15 minutes by car. Turn left on Main Road, then continue straight for 3 kilometers. The destination will be on your right. Would you like me to start navigation?`;
  }

  private handleFilterResults(parameters: Record<string, unknown>): string {
    const filterType = String(parameters.filterType);
    const value = parameters.value;

    switch (filterType) {
      case 'rating':
        this.filters.rating = Number(value);
        break;
      case 'distance':
        this.filters.distance = Number(value);
        break;
      case 'priceLevel':
        this.filters.priceLevel = String(value);
        break;
      case 'isOpen':
        this.filters.isOpen = String(value).toLowerCase() === 'true';
        break;
      default:
        return `I couldn't apply that filter. Available filters are: rating, distance, price level, and availability.`;
    }

    // Apply filters
    let filtered = [...this.searchResults];

    if (this.filters.rating) {
      filtered = filtered.filter(r => r.rating >= this.filters.rating!);
    }
    if (this.filters.isOpen !== undefined) {
      filtered = filtered.filter(r => r.isOpen === this.filters.isOpen);
    }

    if (filtered.length === 0) {
      return `No results match your filters. Would you like to adjust your criteria?`;
    }

    const result = filtered[0];
    return `Filtered to ${filtered.length} result${filtered.length > 1 ? 's' : ''}. Top match: ${result.name}, rated ${result.rating} stars, ${result.isOpen ? 'currently open' : 'currently closed'}. Would you like more details?`;
  }

  private handleViewDetails(parameters: Record<string, unknown>): string {
    const itemId = parameters.itemId || this.searchResults[0]?.id;

    if (!itemId) {
      return `Which place would you like to know more about?`;
    }

    // In production, this would fetch details from API
    const result = this.searchResults.find(r => r.id === itemId) || this.searchResults[0];

    if (!result) {
      return `I couldn't find details for that place. Would you like to search for something specific?`;
    }

    return `${result.name} is a ${result.category} located at ${result.address}. It has a ${result.rating} star rating and is ${result.isOpen ? 'currently open' : 'currently closed'}. ${result.phone ? `You can reach them at ${result.phone}.` : ''} Would you like to call them, get directions, or book an appointment?`;
  }

  private handleBookAppointment(parameters: Record<string, unknown>): string {
    const itemId = parameters.itemId || this.searchResults[0]?.id;
    const date = parameters.date || new Date();
    const time = parameters.time || '10:00';
    const partySize = parameters.partySize || 1;

    const result = this.searchResults.find(r => r.id === itemId) || this.searchResults[0];

    if (!result) {
      return `Please select a place first to book an appointment.`;
    }

    // In production, this would call the booking API
    const bookingId = `BKG-${Date.now().toString(36).toUpperCase()}`;

    this.emit('appointment:booked', {
      bookingId,
      placeId: result.id,
      placeName: result.name,
      date,
      time,
      partySize,
    });

    return `Your appointment at ${result.name} has been booked for ${date} at ${time} for ${partySize} person${partySize > 1 ? 's' : ''}. Booking ID: ${bookingId}. You will receive a confirmation SMS shortly.`;
  }

  private handleCallBusiness(parameters: Record<string, unknown>): string {
    const itemId = parameters.itemId || this.searchResults[0]?.id;
    const result = this.searchResults.find(r => r.id === itemId) || this.searchResults[0];

    if (!result || !result.phone) {
      return `I'm sorry, I don't have a phone number for that place. Would you like to search for another?`;
    }

    this.emit('call:initiated', { placeId: result.id, phone: result.phone });

    return `I'm connecting you to ${result.name}. Their number is ${result.phone}.`;
  }

  private handleShareLocation(): string {
    const currentLocation = this.session?.context?.customData?.get('currentLocation') || 'Mumbai, Maharashtra';

    return `Your current location appears to be ${currentLocation}. This information can be used to find nearby places and get directions. Would you like me to search for something near you?`;
  }

  private handleSaveFavorite(parameters: Record<string, unknown>): string {
    const itemId = parameters.itemId || this.searchResults[0]?.id;
    const result = this.searchResults.find(r => r.id === itemId) || this.searchResults[0];

    if (!result) {
      return `Please select a place first to save.`;
    }

    this.emit('favorite:added', { placeId: result.id, placeName: result.name });

    return `${result.name} has been saved to your favorites. You can access it anytime from your saved places.`;
  }

  private generateMockResults(query: string): SearchResult[] {
    // Generate mock results for demonstration
    const categories = ['Restaurant', 'Hotel', 'Shop', 'Service'];
    const names = ['Royal Palace', 'Green Garden', 'City Center', 'Sunset View', 'Golden Dragon'];

    return names.map((name, idx) => ({
      id: `result-${idx}`,
      name: `${name} ${query}`,
      category: categories[idx % categories.length],
      rating: 3.5 + (Math.random() * 1.5),
      distance: `${(Math.random() * 5).toFixed(1)} km`,
      priceLevel: idx % 4,
      address: `${idx + 1} Main Street, Mumbai`,
      phone: `+91 98765${43000 + idx}`,
      isOpen: Math.random() > 0.3,
    }));
  }

  private async handleGoodbye(): Promise<string> {
    await this.endSession();

    return `Thank you for using voice search! Have a great day!`;
  }

  private handleUnknown(): string {
    return `I can help you search for places, find nearby locations, get directions, and book appointments. What would you like to do?`;
  }

  /**
   * Get current search results
   */
  getSearchResults(): SearchResult[] {
    return [...this.searchResults];
  }

  /**
   * Clear search results
   */
  clearResults(): void {
    this.searchResults = [];
    this.filters = {};
  }
}

/**
 * Factory function to create a Voice Search Agent
 */
export function createVoiceSearchAgent(agent: VoiceAgent): VoiceSearchAgent {
  return new VoiceSearchAgent({ agent });
}
