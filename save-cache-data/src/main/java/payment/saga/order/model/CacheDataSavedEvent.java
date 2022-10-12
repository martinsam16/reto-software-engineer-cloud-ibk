package payment.saga.order.model;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CacheDataSavedEvent implements Event{
    private static final String EVENT = "CacheDataSaved";

    private String key;
    private OrderPurchase value;

    @Override
    public String getEvent() {
        return EVENT;
    }
}
