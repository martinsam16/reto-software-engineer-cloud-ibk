package payment.saga.order.processor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import payment.saga.order.model.CacheDataSavedEvent;
import reactor.core.publisher.Sinks;

@Component
public class CacheDataProcessor {
    private final Sinks.Many<CacheDataSavedEvent> sink;

    @Autowired
    public CacheDataProcessor(Sinks.Many<CacheDataSavedEvent> sink) {
        this.sink = sink;
    }

    public void process(CacheDataSavedEvent event) {
        sink.emitNext(event, Sinks.EmitFailureHandler.FAIL_FAST);
    }
}
