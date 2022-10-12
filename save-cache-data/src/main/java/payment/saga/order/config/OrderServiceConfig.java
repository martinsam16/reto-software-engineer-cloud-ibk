package payment.saga.order.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import payment.saga.order.model.CacheDataSavedEvent;
import payment.saga.order.model.OrderPurchaseEvent;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;


import java.util.function.Supplier;

@Configuration
public class OrderServiceConfig {

    @Bean
    public Sinks.Many<OrderPurchaseEvent> sinkOrderPurchaseEvent() {
        return Sinks.many()
                .multicast()
                .directBestEffort();
    }

    @Bean
    public Sinks.Many<CacheDataSavedEvent> sinkCacheDataSavedEvent() {
        return Sinks.many()
                .multicast()
                .directBestEffort();
    }

    @Bean
    public Supplier<Flux<OrderPurchaseEvent>> orderPurchaseEventPublisher(
            Sinks.Many<OrderPurchaseEvent> publisher) {
        return publisher::asFlux;
    }

    @Bean
    public Supplier<Flux<CacheDataSavedEvent>> cacheDataSavedEventPublisher(
            Sinks.Many<CacheDataSavedEvent> publisher) {
        return publisher::asFlux;
    }

}
