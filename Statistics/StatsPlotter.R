install.packages('tidyverse', 'ggplot2', 'viridisLite')
library(tidyverse)
library(ggplot2)
library(dplyr)
library(viridisLite)
library(hrbrthemes)
library(plyr)
library(viridis)
library(ggrepel)

#### Ratio of listings to apartments ####

indexTypesList = c("All Sources", "olx.ro", "imobiliare.ro", "publi24.ro", "anuntul.ro")

listings_apartments_data = read_csv("./Results/results-ratios.csv", show_col_types = FALSE)

listings_apartments_data = listings_apartments_data %>%
  gather(
    entity, count, listingsCount:apartmentsCount,
  ) %>%
  mutate(
    source = plyr::mapvalues(
      x = source,
      from = NA,
      to = "All Sources"
    ),
    entity = plyr::mapvalues(
      x = entity,
      from = c("listingsCount", "apartmentsCount"),
      to = c("Listings", "Apartments")
    ),
    invRatio = round(1 / ratio, 2),
  )

listings_apartments_data %>%
  ggplot(aes(
    fill = entity,
    y = count,
    x = factor(source, level = indexTypesList)
  )) +
  geom_bar(position = "fill", stat = "identity") +
  scale_fill_manual(values=c("#ff5c1c", "#0a60c9")) +
  xlab("")+ ylab("") +
  labs(fill='')  +
  # ggtitle(paste("Ratio of Apartments to Listings Among Multiple Sources\n")) +
  geom_text(aes(label = count), size = 4, position = position_fill(vjust = 0.5)) +
  geom_label(
    label="10 : 22", x=1, y=83214 / (83214 + 37589),
    label.padding = unit(0.55, "lines"), label.size = 0.35, fill="#f3ff00"
  ) +
  geom_label(
    label="10 : 17", x=2, y=30824 / (30824 + 18031),
    label.padding = unit(0.55, "lines"), label.size = 0.35, fill="#f3ff00"
  ) +
  geom_label(
    label="10 : 16", x=3, y=37749 / (37749 + 24096),
    label.padding = unit(0.55, "lines"), label.size = 0.35, fill="#f3ff00"
  ) +
  geom_label(
    label="10 : 13", x=4, y=11602 / (11602 + 9108),
    label.padding = unit(0.55, "lines"), label.size = 0.35, fill="#f3ff00"
  ) +
  geom_label(
    label="10 : 12", x=5, y=3042 / (3042 + 2624),
    label.padding = unit(0.55, "lines"), label.size = 0.35, fill="#f3ff00"
  ) +
  theme_bw() +
  theme(
    plot.title = element_text(hjust = 0.5),
    axis.text=element_text(size=12),
    axis.text.y=element_blank(),
    axis.ticks.y=element_blank() 
  )

#### Comparison between the three indexes MONTHLY ####

monthly_data = read_csv("./Results/results-by-month-with-tva.csv", show_col_types = FALSE)

startDatesList = c("01.01.2023", "01.02.2023", "01.03.2023", "01.04.2023", "01.05.2023")
monthsList = c("January", "February", "March", "April", "May")

monthly_data = monthly_data %>%
  mutate(
    month = plyr::mapvalues(
      x = startDate,
      from = startDatesList,
      to = monthsList
    )
  ) %>%
  select(-c("startDate", "endDate"))

plot_monthly_3_rooms_comparisons_for_surf_price = function(data) {
  comparison_data = data %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 3)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3),
        to = c("One Room", "Two Rooms", "Three Rooms")
      ),
      avgPricePerSurface = round(avgPricePerSurface),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = factor(month, level = monthsList), 
      y = avgPricePerSurface, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms")),
               scales = "free_y",
               ncol = 1) +
    geom_text_repel(
      min.segment.length = Inf,
      aes(label = avgPricePerSurface),
      size = 3,
    ) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Monthly Evolution of the Average Surface Price (euro/sqm) for Apartments\n")) +
    theme_bw() +
    theme(plot.title = element_text(hjust = 0.5))
}

plot_monthly_3_rooms_comparisons_for_full_price = function(data) {
  comparison_data = data %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 3)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3),
        to = c("One Room", "Two Rooms", "Three Rooms")
      ),
      avgPrice = round(avgPrice),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = factor(month, level = monthsList), 
      y = avgPrice, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms")),
               scales = "free_y",
               ncol = 1) +
    geom_text_repel(
      min.segment.length = Inf,
      aes(label = avgPrice),
      size = 3,
    ) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Monthly Evolution of the Average Price (euro) for Apartments\n")) +
    theme_bw() +
    theme(plot.title = element_text(hjust = 0.5))
}

plot_monthly_3_rooms_comparisons_for_full_price(monthly_data)
plot_monthly_3_rooms_comparisons_for_surf_price(monthly_data)


#### Comparison between the three indexes WEEKLY ####


weekly_data = read_csv("./Results/results-by-week-with-tva.csv", show_col_types = FALSE)

weekly_data = weekly_data %>%
  mutate(
    week = as.Date(endDate, tryFormats = c("%d.%m.%Y")) + 1
  ) %>%
  select(-c("startDate", "endDate"))


plot_weekly_3_rooms_comparisons_for_surf_price = function(data) {
  comparison_data = data %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 3)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3),
        to = c("One Room", "Two Rooms", "Three Rooms")
      ),
      avgPricePerSurface = round(avgPricePerSurface),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = week, 
      y = avgPricePerSurface, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    scale_x_date(date_labels = "%d %b", date_breaks = "1 week") +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms")),
               scales = "free_y",
               ncol = 1) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Weekly Evolution of the Average Price per Surface (euro/sqm) for Apartments\n")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      axis.text.x = element_text(angle = 60, hjust = 1)
    )
}

plot_weekly_3_rooms_comparisons_for_full_price = function(data) {
  comparison_data = data %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 3)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3),
        to = c("One Room", "Two Rooms", "Three Rooms")
      ),
      avgPrice = round(avgPrice),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = week, 
      y = avgPrice, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    scale_x_date(date_labels = "%d %b", date_breaks = "1 week") +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms")),
               scales = "free_y",
               ncol = 1) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Weekly Evolution of the Average Price (euro) for Apartments\n")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      axis.text.x = element_text(angle = 60, hjust = 1)
    )
}

plot_weekly_3_rooms_comparisons_for_full_price(weekly_data)
plot_weekly_3_rooms_comparisons_for_surf_price(weekly_data)


#### Comparison between the three indexes DAILY ####

daily_data = read_csv("./Results/results-by-day-with-tva-corrected.csv", show_col_types = FALSE)

daily_data = daily_data %>%
  mutate(
    day = as.Date(startDate, tryFormats = c("%d.%m.%Y"))
  ) %>%
  select(-c("startDate", "endDate"))

plot_daily_3_rooms_comparisons_for_surf_price = function(data) {
  comparison_data = data %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 3)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3),
        to = c("One Room", "Two Rooms", "Three Rooms")
      ),
      avgPricePerSurface = round(avgPricePerSurface),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = day, 
      y = avgPricePerSurface, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    # geom_point(shape = 19, size = 1) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    scale_x_date(
      date_labels = "%d %b",
      date_breaks = "1 week",
      date_minor_breaks = "1 day",
      limits = as.Date(c("2023-01-01", "2023-05-31"))
    ) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms")),
               scales = "free_y",
               ncol = 1) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Daily Evolution of the Average Price per Surface (euro/sqm) for Apartments\n")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      axis.text.x = element_text(angle = 60, hjust = 1)
    )
}

plot_daily_3_rooms_comparisons_for_full_price = function(data) {
  comparison_data = data %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 3)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3),
        to = c("One Room", "Two Rooms", "Three Rooms")
      ),
      avgPrice = round(avgPrice),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = day, 
      y = avgPrice, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    # geom_point(shape = 19, size = 1) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    scale_x_date(
      date_labels = "%d %b",
      date_breaks = "1 week",
      date_minor_breaks = "1 day",
      # expand = c(0.02, 0.02)
    ) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms")),
               scales = "free_y",
               ncol = 1) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Daily Evolution of the Average Price (euro) for Apartments\n")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      axis.text.x = element_text(angle = 60, hjust = 1)
    )
}

plot_daily_3_rooms_comparisons_for_full_price(daily_data)
plot_daily_3_rooms_comparisons_for_surf_price(daily_data)


#### Monthly Comparison with Imobiliare.ro ####

data = read_csv("./Results/results-by-month-without-tva.csv", show_col_types = FALSE)

startDatesList = c("01.01.2023", "01.02.2023", "01.03.2023", "01.04.2023", "01.05.2023")
monthsList = c("January", "February", "March", "April", "May")

data = data %>%
  mutate(
    month = plyr::mapvalues(
      x = startDate,
      from = startDatesList,
      to = monthsList
    )
  ) %>%
  select(-c("startDate", "endDate"))

data_without_imobiliare = data

PUBLIC_MONTHS_COUNT = 5
PUBLIC_MONTHS = c("January", "February", "March", "April", "May")

imobiliare_ro_data = data.frame(
  avgPrice = rep(NA, 9 * PUBLIC_MONTHS_COUNT),
  avgPricePerSurface = c(
    # January
    1500, 1440, 1508, 1282, 1562, 1387, 1486, 1652, 1500,
    # February
    1500, 1452, 1516, 1283, 1566, 1380, 1500, 1681, 1500,
    # March
    1507, 1452, 1521, 1267, 1571, 1400, 1500, 1665, 1500,
    # April
    1500, 1432, 1510, 1266, 1562, 1375, 1490, 1658, 1487,
    # May
    1498, 1432, 1507, 1239, 1555, 1375, 1490, 1709, 1483
  ),
  roomsCount = rep( c(NA, NA, NA, 1, 1, 2, 2, 3, 3), PUBLIC_MONTHS_COUNT),
  newApartment = rep( c(NA, rep(c(1, 0), 4)), PUBLIC_MONTHS_COUNT),
  indexType = rep("Imobiliare.ro", 9 * PUBLIC_MONTHS_COUNT),
  month = rep(PUBLIC_MONTHS, 1, each = 9)
)

data = bind_rows(data, imobiliare_ro_data)

plot_rooms_comparisons_for_age = function(data, ageParam, ageText) {
  age_data = data %>%
    filter(newApartment == ageParam) %>%
    filter(between(roomsCount, 1, 3) | is.na(roomsCount)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3, NA),
        to = c("One Room", "Two Rooms", "Three Rooms", "Any Number of Rooms")
      ),
      avgPricePerSurface = round(avgPricePerSurface),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  age_data %>%
    ggplot(aes(
      x = factor(month, level = PUBLIC_MONTHS), 
      y = avgPricePerSurface, 
      group = factor(indexType, levels = c("Imobiliare.ro", "Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Imobiliare.ro", "Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#ee284b", "#720000", "#00BCD8", "#009946")) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms", "Any Number of Rooms")),
               scales = "free_y") +
    geom_text_repel(
      aes(label = avgPricePerSurface),
      size = 3
    ) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Evolution of the Average Price per Surface (euro/sqm) for", ageText)) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      legend.position="top",
      legend.title = element_text(size=10, face="bold")
    )
}

plot_rooms_comparisons_for_age_full_price = function(data, ageParam, ageText) {
  age_data = data %>%
    filter(newApartment == ageParam) %>%
    filter(between(roomsCount, 1, 3) | is.na(roomsCount)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3, NA),
        to = c("One Room", "Two Rooms", "Three Rooms", "Any Number of Rooms")
      ),
      avgPrice = round(avgPrice),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  age_data %>%
    ggplot(aes(
      x = factor(month, level = PUBLIC_MONTHS), 
      y = avgPricePerSurface, 
      group = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#720000", "#00BCD8", "#009946")) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms", "Any Number of Rooms")),
               scales = "free_y") +
    geom_text_repel(
      aes(label = avgPrice),
      size = 3
    ) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Evolution of the Average Price (euro) for", ageText)) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      legend.position="top",
      legend.title = element_text(size=10, face="bold")
    )
}

plot_barplot_general_comparison = function(data) {
  general_data = data %>%
    filter(is.na(roomsCount) & is.na(newApartment)) %>%
    mutate(
      avgPricePerSurface = round(avgPricePerSurface),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      ),
    )
  
  general_data %>%
    ggplot(aes(
      x = factor(month, level = PUBLIC_MONTHS),
      y = avgPricePerSurface,
      fill = factor(indexType, levels = c("Imobiliare.ro", "Listings", "Apartments", "Sold Apartments"))
    )) +
    geom_col(width = 0.7, position = position_dodge(0.8)) +
    scale_fill_manual(values=c("#ee284b", "#720000", "#00BCD8", "#009946")) +
    geom_text(
      aes(label = avgPricePerSurface),
      size = 4,
      vjust = -1.5, position = position_dodge(.8)
    ) +
    ylim(0, 2100) +
    xlab("")+ ylab("") +
    labs(fill='Index Type')  +
    ggtitle(paste("Average Prices per Surface (euro/sqm) for All Apartments of Bucharest")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      legend.position="top",
      legend.title = element_text(size=10, face="bold")
    )
}

plot_barplot_general_comparison_full_price = function(data) {
  general_data = data %>%
    filter(is.na(roomsCount) & is.na(newApartment)) %>%
    mutate(
      avgPrice = round(avgPrice),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      ),
    )
  
  general_data %>%
    ggplot(aes(
      x = factor(month, level = PUBLIC_MONTHS),
      y = avgPrice,
      fill = factor(indexType, levels = c("Listings", "Apartments", "Sold Apartments"))
    )) +
    geom_col(width = 0.7, position = position_dodge(0.8)) +
    scale_fill_manual(values=c("#720000", "#00BCD8", "#009946")) +
    geom_text(
      aes(label = avgPrice),
      size = 4,
      vjust = -1.5, position = position_dodge(.8)
    ) +
    ylim(0, 130000) +
    xlab("")+ ylab("") +
    labs(fill='Index Type')  +
    ggtitle(paste("Average Prices (euro) for All Apartments of Bucharest")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      legend.position="top",
      legend.title = element_text(size=10, face="bold")
    )
}

plot_rooms_comparisons_for_age(data, 0, "Old Apartments")
plot_rooms_comparisons_for_age(data, 1, "New Apartments")
plot_barplot_general_comparison(data)

# plot_rooms_comparisons_for_age_full_price(data_without_imobiliare, 1, "New Apartments")
# plot_rooms_comparisons_for_age_full_price(data_without_imobiliare, 0, "Old Apartments")
# plot_barplot_general_comparison_full_price(data_without_imobiliare)


#### Monthly Comparison with Anuntul.ro ####

data = read_csv("./Results/results-by-month-without-tva.csv", show_col_types = FALSE)

startDatesList = c("01.01.2023", "01.02.2023", "01.03.2023", "01.04.2023", "01.05.2023")
monthsList = c("January", "February", "March", "April", "May")

data = data %>%
  mutate(
    month = plyr::mapvalues(
      x = startDate,
      from = startDatesList,
      to = monthsList
    )
  ) %>%
  select(-c("startDate", "endDate"))

PUBLIC_MONTHS_COUNT = 5
PUBLIC_MONTHS = c("January", "February", "March", "April", "May")

anuntul_ro_data = data.frame(
  avgPrice = c(
    # January
    48342, 73596, 106480, 155231, # 1 room - 4+ rooms
    # February
    48973, 74002, 105417, 152756, # 1 room - 4+ rooms
    # March
    50077, 75452, 105473, 162952, # 1 room - 4+ rooms
    # April
    49434, 75871, 108018, 161203, # 1 room - 4+ rooms
    # May
    49099, 76070, 109928, 170847 # 1 room - 4+ rooms
  ),
  avgPricePerSurface = c(
    # January
    1414, 1343, 1384, 1408, # 1 room - 4+ rooms
    # February
    1448, 1360, 1399, 1427, # 1 room - 4+ rooms
    # March
    1461, 1371, 1410, 1506, # 1 room - 4+ rooms
    # April
    1450, 1367, 1435, 1500, # 1 room - 4+ rooms
    # May
    1469, 1404, 1461, 1568 # 1 room - 4+ rooms
  ),
  roomsCount = rep( c(1, 2, 3, 4), PUBLIC_MONTHS_COUNT),
  newApartment = rep(NA, 4 * PUBLIC_MONTHS_COUNT),
  indexType = rep("Anuntul.ro", 4 * PUBLIC_MONTHS_COUNT),
  month = rep(PUBLIC_MONTHS, 1, each = 4)
)

data = bind_rows(data, anuntul_ro_data)

plot_rooms_comparisons_for_price_type = function(data, priceColumn, priceText) {
  comparison_data = data %>%
    filter(month %in% PUBLIC_MONTHS) %>%
    filter(is.na(newApartment)) %>%
    filter(between(roomsCount, 1, 4)) %>%
    mutate(
      roomsCount = plyr::mapvalues(
        x = roomsCount,
        from = c(1, 2, 3, 4),
        to = c("One Room", "Two Rooms", "Three Rooms", "Four or More Rooms")
      ),
      avgPrice = round(avgPrice),
      avgPricePerSurface = round(avgPricePerSurface),
      indexType = plyr::mapvalues(
        x = indexType,
        from = c("listings", "apartments", "soldApartments"),
        to = c("Listings", "Apartments", "Sold Apartments")
      )
    )
  
  comparison_data %>%
    ggplot(aes(
      x = factor(month, level = PUBLIC_MONTHS), 
      y = .data[[priceColumn]], 
      group = factor(indexType, levels = c("Anuntul.ro", "Listings", "Apartments", "Sold Apartments")),
      color = factor(indexType, levels = c("Anuntul.ro", "Listings", "Apartments", "Sold Apartments")),
    )) +
    geom_line(size = 1) +
    geom_point(shape = 19, size = 2) +
    scale_color_manual(values=c("#ed1b22", "#720000", "#00BCD8", "#009946")) +
    facet_wrap(~factor(roomsCount, levels = c("One Room", "Two Rooms", "Three Rooms", "Four or More Rooms")),
               scales = "free_y") +
    geom_text_repel(
      aes(label = .data[[priceColumn]]),
      size = 3
    ) +
    xlab("")+ ylab("") +
    labs(color='Index Type')  +
    ggtitle(paste("Evolution of the", priceText, "for all Apartments of Bucharest")) +
    theme_bw() +
    theme(
      plot.title = element_text(hjust = 0.5),
      legend.position="top",
      legend.title = element_text(size=10, face="bold")
    )
}

plot_rooms_comparisons_for_price_type(data, "avgPrice", "Average Price (euro)")
plot_rooms_comparisons_for_price_type(data, "avgPricePerSurface", "Average Price per Surface (euro/sqm)")






